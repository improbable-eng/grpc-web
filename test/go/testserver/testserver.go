package main

import (
	"flag"
	"log"
	"net/http"
	"os"

	"google.golang.org/grpc"
	"google.golang.org/grpc/grpclog"

	"fmt"

	testproto "../_proto/improbable/grpcweb/test"
	google_protobuf "github.com/golang/protobuf/ptypes/empty"
	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/codes"
	"golang.org/x/net/context"
	"google.golang.org/grpc/transport"
)

var (
	http1Port       = flag.Int("http1_port", 9090, "Port to listen with HTTP1.1 on.")
	http1EmptyPort  = flag.Int("http1_empty_port", 9095, "Port to listen with HTTP1.1 on with a grpc server that has no services.")
	http2Port       = flag.Int("http2_port", 9100, "Port to listen with HTTP2 with TLS on.")
	http2EmptyPort  = flag.Int("http2_empty_port", 9105, "Port to listen with HTTP2 with TLS on with a grpc server that has no services.")
	tlsCertFilePath = flag.String("tls_cert_file", "../../../misc/localhost.crt", "Path to the CRT/PEM file.")
	tlsKeyFilePath  = flag.String("tls_key_file", "../../../misc/localhost.key", "Path to the private key file.")
)

func main() {
	flag.Parse()

	grpcServer := grpc.NewServer()
	testproto.RegisterTestServiceServer(grpcServer, &testSrv{})
	grpclog.SetLogger(log.New(os.Stdout, "testserver: ", log.LstdFlags))

	wrappedServer := grpcweb.WrapServer(grpcServer)
	handler := func(resp http.ResponseWriter, req *http.Request) {
		wrappedServer.ServeHttp(resp, req)
	}

	emptyGrpcServer := grpc.NewServer()
	emptyWrappedServer := grpcweb.WrapServer(emptyGrpcServer, grpcweb.WithCorsForRegisteredEndpointsOnly(false))
	emptyHandler := func(resp http.ResponseWriter, req *http.Request) {
		emptyWrappedServer.ServeHttp(resp, req)
	}

	http1Server := http.Server{
		Addr:    fmt.Sprintf(":%d", *http1Port),
		Handler: http.HandlerFunc(handler),
	}
	http1EmptyServer := http.Server{
		Addr:    fmt.Sprintf(":%d", *http1EmptyPort),
		Handler: http.HandlerFunc(func(res http.ResponseWriter, req *http.Request) {
			emptyHandler(res, req)
		}),
	}
	http2Server := http.Server{
		Addr:    fmt.Sprintf(":%d", *http2Port),
		Handler: http.HandlerFunc(handler),
	}
	http2EmptyServer := http.Server{
		Addr:    fmt.Sprintf(":%d", *http2EmptyPort),
		Handler: http.HandlerFunc(emptyHandler),
	}

	grpclog.Printf("Starting servers. http1.1 port: %d, http1.1 empty port: %d, http2 port: %d, http2 empty port: %d", *http1Port, *http1EmptyPort, *http2Port, *http2EmptyPort)

	// Start the empty Http1.1 server
	go func() {
		if err := http1EmptyServer.ListenAndServe(); err != nil {
			grpclog.Fatalf("failed starting http1.1 empty server: %v", err)
		}
	}()

	// Start the Http1.1 server
	go func() {
		if err := http1Server.ListenAndServe(); err != nil {
			grpclog.Fatalf("failed starting http1.1 server: %v", err)
		}
	}()

	// Start the empty Http2 server
	go func() {
		if err := http2EmptyServer.ListenAndServeTLS(*tlsCertFilePath, *tlsKeyFilePath); err != nil {
			grpclog.Fatalf("failed starting http2 empty server: %v", err)
		}
	}()

	// Start the Http2 server
	if err := http2Server.ListenAndServeTLS(*tlsCertFilePath, *tlsKeyFilePath); err != nil {
		grpclog.Fatalf("failed starting http2 server: %v", err)
	}
}

type testSrv struct {
}

func (s *testSrv) PingEmpty(ctx context.Context, _ *google_protobuf.Empty) (*testproto.PingResponse, error) {
	grpc.SendHeader(ctx, metadata.Pairs("HeaderTestKey1", "Value1", "HeaderTestKey2", "Value2"))
	grpc.SetTrailer(ctx, metadata.Pairs("TrailerTestKey1", "Value1", "TrailerTestKey2", "Value2"))
	return &testproto.PingResponse{Value: "foobar"}, nil
}

func (s *testSrv) Ping(ctx context.Context, ping *testproto.PingRequest) (*testproto.PingResponse, error) {
	grpc.SendHeader(ctx, metadata.Pairs("HeaderTestKey1", "Value1", "HeaderTestKey2", "Value2"))
	grpc.SetTrailer(ctx, metadata.Pairs("TrailerTestKey1", "Value1", "TrailerTestKey2", "Value2"))
	return &testproto.PingResponse{Value: ping.Value, Counter: 252}, nil
}

func (s *testSrv) PingError(ctx context.Context, ping *testproto.PingRequest) (*google_protobuf.Empty, error) {
	if ping.FailureType == testproto.PingRequest_DROP {
		t, _ := transport.StreamFromContext(ctx)
		t.ServerTransport().Close()
		return nil, grpc.Errorf(codes.Unavailable, "You got closed. You probably won't see this error")

	}
	grpc.SendHeader(ctx, metadata.Pairs("HeaderTestKey1", "Value1", "HeaderTestKey2", "Value2"))
	grpc.SetTrailer(ctx, metadata.Pairs("TrailerTestKey1", "Value1", "TrailerTestKey2", "Value2"))
	return nil, grpc.Errorf(codes.Code(ping.ErrorCodeReturned), "Intentionally returning error for PingError")
}

func (s *testSrv) PingList(ping *testproto.PingRequest, stream testproto.TestService_PingListServer) error {
	stream.SendHeader(metadata.Pairs("HeaderTestKey1", "Value1", "HeaderTestKey2", "Value2"))
	stream.SetTrailer(metadata.Pairs("TrailerTestKey1", "Value1", "TrailerTestKey2", "Value2"))
	for i := int32(0); i < ping.ResponseCount; i++ {
		stream.Send(&testproto.PingResponse{Value: fmt.Sprintf("%s %d", ping.Value, i), Counter: i})
	}
	if ping.FailureType == testproto.PingRequest_DROP {
		t, _ := transport.StreamFromContext(stream.Context())
		t.ServerTransport().Close()
		return nil

	}
	return nil
}
