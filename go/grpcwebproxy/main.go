package main

import (
	"fmt"
	"log"
	"net"
	"net/http"
	_ "net/http/pprof" // register in DefaultServerMux
	"os"
	"sync"
	"time"

	"nhooyr.io/websocket"

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
	"golang.org/x/net/trace" // register in DefaultServerMux
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

	useWebsockets            = pflag.Bool("use_websockets", false, "whether to use beta websocket transport layer")
	websocketPingInterval    = pflag.Duration("websocket_ping_interval", 0, "whether to use websocket keepalive pinging. Only used when using websockets. Configured interval must be >= 1s.")
	websocketReadLimit       = pflag.Int64("websocket_read_limit", 0, "sets the maximum message read limit on the underlying websocket. The default message read limit is 32769 bytes.")
	websocketCompressionMode = pflag.String("websocket_compression_mode", "no_context_takeover", "set compression mode for websocket. Values are no_context_takeover (, context_takeover, disabled. The default value is no_context_takeover.")

	flagHttpMaxWriteTimeout = pflag.Duration("server_http_max_write_timeout", 10*time.Second, "HTTP server config, max write duration.")
	flagHttpMaxReadTimeout  = pflag.Duration("server_http_max_read_timeout", 10*time.Second, "HTTP server config, max read duration.")

	enableRequestDebug       = pflag.Bool("enable_request_debug", false, "whether to enable (/debug/requests) and connection(/debug/events) monitoring; also controls prometheus monitoring (/metrics)")
	enableHealthCheckService = pflag.Bool("enable_health_check_service", false, "whether to enable health checking service on the backend connection")
	enableHealthEndpoint     = pflag.Bool("enable_health_endpoint", false, "whether to enable health endpoint on the proxy. If enable_health_check_service is set to true the endpoint will serve the status got from backend, otherwise http.StatusOK(200) will be returned")
	healthEndpointName       = pflag.String("health_endpoint_name", "_health", "health endpoint name to be used (_health by default)")
	healthServiceName        = pflag.String("health_service_name", "", "health service name to request from backend (\"\" by default, asking for status of all services at once on the backend)")
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

	backendConn := dialBackendOrFail()

	grpcServer := buildGrpcProxyServer(backendConn, logEntry)
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
		if *websocketReadLimit > 0 {
			options = append(options, grpcweb.WithWebsocketsMessageReadLimit(*websocketReadLimit))
		}

		options = append(
			options,
			grpcweb.WithWebsocketPingInterval(*websocketPingInterval),
		)

		var compressionMode websocket.CompressionMode
		switch *websocketCompressionMode {
		case "no_context_takeover":
			compressionMode = websocket.CompressionNoContextTakeover
		case "context_takeover":
			compressionMode = websocket.CompressionContextTakeover
		case "disabled":
			compressionMode = websocket.CompressionDisabled
		default:
			logrus.Fatalf("unknwon param for websocket compression mode: %s", *websocketCompressionMode)
		}

		options = append(
			options,
			grpcweb.WithWebsocketCompressionMode(compressionMode),
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

	serveMux := http.NewServeMux()
	serveMux.Handle("/", wrappedGrpc)

	if *enableHealthEndpoint {
		logrus.Printf("health endpoint enabled on /%v", *healthEndpointName)
		if *enableHealthCheckService {
			logrus.Printf("health checking enabled for service '%v'", *healthServiceName)
			// Health checking endpoint set up
			healthCtx, cancel := context.WithCancel(context.Background())
			defer cancel()
			healthChecker := runHealthChecker(healthCtx, backendConn, *healthServiceName)
			serveMux.HandleFunc("/"+*healthEndpointName, func(resp http.ResponseWriter, req *http.Request) {
				status := healthChecker.GetStatus()
				resp.WriteHeader(status)
			})
		} else {
			// Health endpoint always returns HTTP status 200 if service is disabled
			serveMux.HandleFunc("/"+*healthEndpointName, func(resp http.ResponseWriter, req *http.Request) {
				resp.WriteHeader(http.StatusOK)
			})
		}
	}

	if *runHttpServer {
		// Debug server.
		if *enableRequestDebug {
			serveMux.Handle("/metrics", promhttp.Handler())
			serveMux.HandleFunc("/debug/requests", func(resp http.ResponseWriter, req *http.Request) {
				trace.Traces(resp, req)
			})
			serveMux.HandleFunc("/debug/events", func(resp http.ResponseWriter, req *http.Request) {
				trace.Events(resp, req)
			})
		}

		debugServer := buildServer(wrappedGrpc, serveMux)
		debugListener := buildListenerOrFail("http", *flagHttpPort)
		serveServer(debugServer, debugListener, "http", errChan)
	}

	if *runTlsServer {
		servingServer := buildServer(wrappedGrpc, serveMux)
		servingListener := buildListenerOrFail("http", *flagHttpTlsPort)
		servingListener = tls.NewListener(servingListener, buildServerTlsOrFail())
		serveServer(servingServer, servingListener, "http_tls", errChan)
	}

	<-errChan
	// TODO(mwitkow): Add graceful shutdown.
}

func buildServer(wrappedGrpc *grpcweb.WrappedGrpcServer, handler http.Handler) *http.Server {
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

func buildGrpcProxyServer(backendConn *grpc.ClientConn, logger *logrus.Entry) *grpc.Server {
	// gRPC-wide changes.
	grpc.EnableTracing = true
	grpc_logrus.ReplaceGrpcLogger(logger)

	// gRPC proxy logic.
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

type healthChecker struct {
	status int
	mutex  sync.Mutex
}

func (h *healthChecker) GetStatus() int {
	h.mutex.Lock()
	defer h.mutex.Unlock()
	return h.status
}

func (h *healthChecker) setServing(serving bool) {
	h.mutex.Lock()
	defer h.mutex.Unlock()
	if serving {
		h.status = http.StatusOK
	} else {
		h.status = http.StatusServiceUnavailable
	}
}

// Runs health check on a backend connection for a given service name
// returns *healthChecker to get status from
func runHealthChecker(ctx context.Context, backendConn *grpc.ClientConn, service string) *healthChecker {
	h := new(healthChecker)
	h.status = http.StatusServiceUnavailable

	go func() {
		err := grpcweb.ClientHealthCheck(ctx, backendConn, service, h.setServing)
		if err != nil {
			logrus.Errorf("%s health check service error: %v", service, err)
		}
	}()

	return h
}
