package main

import (
	"fmt"
	"log"
	"net"
	"net/http"
	_ "net/http/pprof" // register in DefaultServerMux
	"os"
	"time"

	"crypto/tls"

	grpc_middleware "github.com/grpc-ecosystem/go-grpc-middleware"
	grpc_logrus "github.com/grpc-ecosystem/go-grpc-middleware/logging/logrus"
	grpc_prometheus "github.com/grpc-ecosystem/go-grpc-prometheus"
	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"github.com/mwitkow/go-conntrack"
	"github.com/mwitkow/grpc-proxy/proxy"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/sirupsen/logrus"
	"github.com/spf13/pflag"
	"golang.org/x/net/context"
	_ "golang.org/x/net/trace" // register in DefaultServerMux
	"google.golang.org/grpc"
	"google.golang.org/grpc/grpclog"
	"google.golang.org/grpc/metadata"
)

var (
	flagBindAddr    = pflag.String("server_bind_address", "0.0.0.0", "address to bind the server to")
	flagHttpPort    = pflag.Int("server_http_debug_port", 8080, "TCP port to listen on for HTTP1.1 debug calls.")
	flagHttpTlsPort = pflag.Int("server_http_tls_port", 8443, "TCP port to listen on for HTTPS (gRPC, gRPC-Web).")

	flagAllowAllOrigins = pflag.Bool("allow_all_origins", false, "allow requests from any origin.")
	flagAllowedOrigins  = pflag.StringSlice("allowed_origins", nil, "comma-separated list of origin URLs which are allowed to make cross-origin requests.")
	flagAllowedHeaders  = pflag.StringSlice("allowed_headers", []string{}, "comma-separated list of headers which are allowed to propagate to the gRPC backend.")

	runHttpServer = pflag.Bool("run_http_server", true, "whether to run HTTP server")
	runTlsServer  = pflag.Bool("run_tls_server", true, "whether to run TLS server")

	useWebsockets         = pflag.Bool("use_websockets", false, "whether to use beta websocket transport layer")
	websocketPingInterval = pflag.Duration("websocket_ping_interval", 0, "whether to use websocket keepalive pinging. Only used when using websockets. Configured interval must be >= 1s.")

	flagHttpMaxWriteTimeout = pflag.Duration("server_http_max_write_timeout", 10*time.Second, "HTTP server config, max write duration.")
	flagHttpMaxReadTimeout  = pflag.Duration("server_http_max_read_timeout", 10*time.Second, "HTTP server config, max read duration.")
)

func main() {
	pflag.Parse()
	for _, flag := range pflag.Args() {
		if flag == "true" || flag == "false" {
			logrus.Fatal("Boolean flags should be set using --flag=false, --flag=true or --flag (which is short for --flag=true). You cannot use --flag true or --flag false.")
		}
		logrus.Fatal("Unknown argument: " + flag)
	}

	logrus.SetOutput(os.Stdout)
	logEntry := logrus.NewEntry(logrus.StandardLogger())

	if *flagAllowAllOrigins && len(*flagAllowedOrigins) != 0 {
		logrus.Fatal("Ambiguous --allow_all_origins and --allow_origins configuration. Either set --allow_all_origins=true OR specify one or more origins to whitelist with --allow_origins, not both.")
	}

	grpcServer := buildGrpcProxyServer(logEntry)
	errChan := make(chan error)

	allowedOrigins := makeAllowedOrigins(*flagAllowedOrigins)

	options := []grpcweb.Option{
		grpcweb.WithCorsForRegisteredEndpointsOnly(false),
		grpcweb.WithOriginFunc(makeHttpOriginFunc(allowedOrigins)),
	}

	if *useWebsockets {
		logrus.Println("using websockets")
		options = append(
			options,
			grpcweb.WithWebsockets(true),
			grpcweb.WithWebsocketOriginFunc(makeWebsocketOriginFunc(allowedOrigins)),
		)
		if *websocketPingInterval >= time.Second {
			logrus.Infof("websocket keepalive pinging enabled, the timeout interval is %s", websocketPingInterval.String())
		}
		options = append(
			options,
			grpcweb.WithWebsocketPingInterval(*websocketPingInterval),
		)
	}

	if len(*flagAllowedHeaders) > 0 {
		options = append(
			options,
			grpcweb.WithAllowedRequestHeaders(*flagAllowedHeaders),
		)
	}

	wrappedGrpc := grpcweb.WrapServer(grpcServer, options...)

	if !*runHttpServer && !*runTlsServer {
		logrus.Fatalf("Both run_http_server and run_tls_server are set to false. At least one must be enabled for grpcweb proxy to function correctly.")
	}

	if *runHttpServer {
		// Debug server.
		debugServer := buildServer(wrappedGrpc)
		http.Handle("/metrics", promhttp.Handler())
		debugListener := buildListenerOrFail("http", *flagHttpPort)
		serveServer(debugServer, debugListener, "http", errChan)
	}

	if *runTlsServer {
		// Debug server.
		servingServer := buildServer(wrappedGrpc)
		servingListener := buildListenerOrFail("http", *flagHttpTlsPort)
		servingListener = tls.NewListener(servingListener, buildServerTlsOrFail())
		serveServer(servingServer, servingListener, "http_tls", errChan)
	}

	<-errChan
	// TODO(mwitkow): Add graceful shutdown.
}

func buildServer(wrappedGrpc *grpcweb.WrappedGrpcServer) *http.Server {
	return &http.Server{
		WriteTimeout: *flagHttpMaxWriteTimeout,
		ReadTimeout:  *flagHttpMaxReadTimeout,
		Handler: http.HandlerFunc(func(resp http.ResponseWriter, req *http.Request) {
			wrappedGrpc.ServeHTTP(resp, req)
		}),
	}
}

func serveServer(server *http.Server, listener net.Listener, name string, errChan chan error) {
	go func() {
		logrus.Infof("listening for %s on: %v", name, listener.Addr().String())
		if err := server.Serve(listener); err != nil {
			errChan <- fmt.Errorf("%s server error: %v", name, err)
		}
	}()
}

func buildGrpcProxyServer(logger *logrus.Entry) *grpc.Server {
	// gRPC-wide changes.
	grpc.EnableTracing = true
	grpc_logrus.ReplaceGrpcLogger(logger)

	// gRPC proxy logic.
	backendConn := dialBackendOrFail()
	director := func(ctx context.Context, fullMethodName string) (context.Context, *grpc.ClientConn, error) {
		md, _ := metadata.FromIncomingContext(ctx)
		outCtx, _ := context.WithCancel(ctx)
		mdCopy := md.Copy()
		delete(mdCopy, "user-agent")
		// If this header is present in the request from the web client,
		// the actual connection to the backend will not be established.
		// https://github.com/improbable-eng/grpc-web/issues/568
		delete(mdCopy, "connection")
		outCtx = metadata.NewOutgoingContext(outCtx, mdCopy)
		return outCtx, backendConn, nil
	}
	// Server with logging and monitoring enabled.
	return grpc.NewServer(
		grpc.CustomCodec(proxy.Codec()), // needed for proxy to function.
		grpc.UnknownServiceHandler(proxy.TransparentHandler(director)),
		grpc.MaxRecvMsgSize(*flagMaxCallRecvMsgSize),
		grpc_middleware.WithUnaryServerChain(
			grpc_logrus.UnaryServerInterceptor(logger),
			grpc_prometheus.UnaryServerInterceptor,
		),
		grpc_middleware.WithStreamServerChain(
			grpc_logrus.StreamServerInterceptor(logger),
			grpc_prometheus.StreamServerInterceptor,
		),
	)
}

func buildListenerOrFail(name string, port int) net.Listener {
	addr := fmt.Sprintf("%s:%d", *flagBindAddr, port)
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		log.Fatalf("failed listening for '%v' on %v: %v", name, port, err)
	}
	return conntrack.NewListener(listener,
		conntrack.TrackWithName(name),
		conntrack.TrackWithTcpKeepAlive(20*time.Second),
		conntrack.TrackWithTracing(),
	)
}

func makeHttpOriginFunc(allowedOrigins *allowedOrigins) func(origin string) bool {
	if *flagAllowAllOrigins {
		return func(origin string) bool {
			return true
		}
	}
	return allowedOrigins.IsAllowed
}

func makeWebsocketOriginFunc(allowedOrigins *allowedOrigins) func(req *http.Request) bool {
	if *flagAllowAllOrigins {
		return func(req *http.Request) bool {
			return true
		}
	} else {
		return func(req *http.Request) bool {
			origin, err := grpcweb.WebsocketRequestOrigin(req)
			if err != nil {
				grpclog.Warning(err)
				return false
			}
			return allowedOrigins.IsAllowed(origin)
		}
	}
}

func makeAllowedOrigins(origins []string) *allowedOrigins {
	o := map[string]struct{}{}
	for _, allowedOrigin := range origins {
		o[allowedOrigin] = struct{}{}
	}
	return &allowedOrigins{
		origins: o,
	}
}

type allowedOrigins struct {
	origins map[string]struct{}
}

func (a *allowedOrigins) IsAllowed(origin string) bool {
	_, ok := a.origins[origin]
	return ok
}
