package main

import (
	"fmt"
	"log"
	"net"
	"os"
	"time"

	"github.com/Sirupsen/logrus"
	"github.com/grpc-ecosystem/go-grpc-prometheus"
	"github.com/mwitkow/go-conntrack"
	"github.com/mwitkow/go-grpc-middleware"
	"github.com/mwitkow/go-grpc-middleware/logging/logrus"
	"github.com/mwitkow/grpc-proxy/proxy"
	"github.com/spf13/pflag"
	"golang.org/x/net/context"
	"google.golang.org/grpc"
)

var (
	flagBindAddr    = pflag.String("server_bind_address", "0.0.0.0", "address to bind the server to")
	flagHttpPort    = pflag.Int("server_http_debug_port", 8080, "TCP port to listen on for HTTP1.1 debug calls. If 0, no insecure HTTP will be open.")
	flagHttpTlsPort = pflag.Int("server_http_tls_port", 8443, "TCP port to listen on for HTTPS (gRPC, gRPC-Web). If 0, no TLS will be open.")

	flagHttpMaxWriteTimeout = pflag.Duration("server_http_max_write_timeout", 10*time.Second, "HTTP server config, max write duration.")
	flagHttpMaxReadTimeout  = pflag.Duration("server_http_max_read_timeout", 10*time.Second, "HTTP server config, max read duration.")
)

func main() {
	pflag.Parse()
	serverTls := buildServerTlsOrFail()

	logrus.SetOutput(os.Stdout)

	logEntry := logrus.NewEntry(logrus.StandardLogger())

	grpcServer := buildGrpcProxyServer(logEntry)

	// This builds

}

func buildGrpcProxyServer(logger *logrus.Entry) *grpc.Server {
	// gRPC-wide changes.
	grpc.EnableTracing = true
	grpc_logrus.ReplaceGrpcLogger(logger)

	// gRPC proxy logic.
	backendConn := dialBackendOrFail()
	director := func(ctx context.Context, fullMethodName string) (*grpc.ClientConn, error) {
		return backendConn, nil
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
