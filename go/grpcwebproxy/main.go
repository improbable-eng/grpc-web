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

	"net/url"

	"github.com/grpc-ecosystem/go-grpc-middleware"
	"github.com/grpc-ecosystem/go-grpc-middleware/logging/logrus"
	"github.com/grpc-ecosystem/go-grpc-prometheus"
	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"github.com/mwitkow/go-conntrack"
	"github.com/mwitkow/grpc-proxy/proxy"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/rs/cors"
	"github.com/sirupsen/logrus"
	"github.com/spf13/pflag"
	"golang.org/x/net/context"
	_ "golang.org/x/net/trace" // register in DefaultServerMux
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

var (
	flagBindAddr    = pflag.String("server_bind_address", "0.0.0.0", "address to bind the server to")
	flagHttpPort    = pflag.Int("server_http_debug_port", 8080, "TCP port to listen on for HTTP1.1 debug calls.")
	flagHttpTlsPort = pflag.Int("server_http_tls_port", 8443, "TCP port to listen on for HTTPS (gRPC, gRPC-Web).")

	flagAllowedOrigins = pflag.StringSlice("allowed_origins", nil, "comma-separated list of origin URLs which are allowed to make cross-origin requests, defaults to denying all cross origin requests, whitelist all origins with '*'")
	flagAllowedHeaders = pflag.StringSlice("allowed_headers", nil, "comma-separated list of simple HTTP headers which are allowed on cross-origin requests, will always allow headers required by the grpcweb specification.")

	runHttpServer = pflag.Bool("run_http_server", true, "whether to run HTTP server")
	runTlsServer  = pflag.Bool("run_tls_server", true, "whether to run TLS server")

	useWebsockets = pflag.Bool("use_websockets", false, "whether to use beta websocket transport layer")

	flagHttpMaxWriteTimeout = pflag.Duration("server_http_max_write_timeout", 10*time.Second, "HTTP server config, max write duration.")
	flagHttpMaxReadTimeout  = pflag.Duration("server_http_max_read_timeout", 10*time.Second, "HTTP server config, max read duration.")
)

var (
	grpcwebSpecHeaders = []string{
		"X-User-Agent",
	}
)

func main() {
	pflag.Parse()

	logrus.SetOutput(os.Stdout)
	logEntry := logrus.NewEntry(logrus.StandardLogger())

	grpcServer := buildGrpcProxyServer(logEntry)
	errChan := make(chan error)

	var options []grpcweb.Option
	if *useWebsockets {
		logrus.Info("enabling websocket transport")
		options = append(
			options,
			grpcweb.WithWebsockets(true),
		)
	}

	wrappedGrpc := grpcweb.WrapServer(grpcServer, options...)

	allowedOrigins := *flagAllowedOrigins
	if len(allowedOrigins) == 0 {
		allowedOrigins = append(allowedOrigins, "_") // override the default behavior of allowing all origins if the list is empty.
	}
	logrus.Infof("allowing CORS from origins: %q", allowedOrigins)

	corsWrapper := cors.New(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedHeaders:   append(*flagAllowedHeaders, grpcwebSpecHeaders...),
		ExposedHeaders:   nil,                                 // make sure that this is *nil*, otherwise the WebResponse overwrite will not work.
		AllowCredentials: true,                                // always allow credentials, otherwise :authorization headers won't work
		MaxAge:           int(10 * time.Minute / time.Second), // make sure pre-flights don't happen too often (every 5s for Chromium :( )
	})

	handler := http.HandlerFunc(func(resp http.ResponseWriter, req *http.Request) {
		if wrappedGrpc.IsGrpcWebSocketRequest(req) {
			origin, ok := isPermittedOriginViaWebSocket(req, allowedOrigins)
			if ok {
				wrappedGrpc.ServeHTTP(resp, req)
			} else {
				logrus.Println(fmt.Sprintf("denying cross-origin resource request via websocket from: %q", origin))
				resp.WriteHeader(http.StatusForbidden)
				resp.Write(make([]byte, 0))
			}
			wrappedGrpc.ServeHTTP(resp, req)
		} else {
			corsWrapper.Handler(http.HandlerFunc(wrappedGrpc.ServeHTTP)).ServeHTTP(resp, req)
		}
	})

	if !*runHttpServer && !*runTlsServer {
		logrus.Fatalf("Both run_http_server and run_tls_server are set to false. At least one must be enabled for grpcweb proxy to function correctly.")
	}

	if *runHttpServer {
		// Debug server.
		debugServer := buildServer(handler)
		http.Handle("/metrics", promhttp.Handler())
		debugListener := buildListenerOrFail("http", *flagHttpPort)
		serveServer(debugServer, debugListener, "http", errChan)
	}

	if *runTlsServer {
		// Debug server.
		servingServer := buildServer(handler)
		servingListener := buildListenerOrFail("http", *flagHttpTlsPort)
		servingListener = tls.NewListener(servingListener, buildServerTlsOrFail())
		serveServer(servingServer, servingListener, "http_tls", errChan)
	}

	<-errChan
	// TODO(mwitkow): Add graceful shutdown.
}
func isPermittedOriginViaWebSocket(req *http.Request, allowedOrigins []string) (string, bool) {
	origin := req.Header.Get("Origin")
	parsed, err := url.ParseRequestURI(origin)
	if err != nil {
		logrus.Println(fmt.Sprintf("failed to parse url for grpc-websocket origin check: %q. error: %v", origin, err))
		return "", false
	}
	if parsed.Host == req.Host {
		// Same origin.
		return origin, true
	}
	for _, v := range allowedOrigins {
		if v == "*" || v == parsed.Host {
			return origin, true
		}
	}
	return origin, false
}

func buildServer(handler http.Handler) *http.Server {
	return &http.Server{
		WriteTimeout: *flagHttpMaxWriteTimeout,
		ReadTimeout:  *flagHttpMaxReadTimeout,
		Handler:      handler,
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
		outCtx = metadata.NewOutgoingContext(outCtx, mdCopy)
		return outCtx, backendConn, nil
	}
	// Server with logging and monitoring enabled.
	return grpc.NewServer(
		grpc.CustomCodec(proxy.Codec()), // needed for proxy to function.
		grpc.UnknownServiceHandler(proxy.TransparentHandler(director)),
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
