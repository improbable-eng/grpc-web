package main

import (
	"crypto/tls"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sync"

	google_protobuf "github.com/golang/protobuf/ptypes/empty"
	"github.com/improbable-eng/grpc-web/go/grpcweb"
	testproto "github.com/improbable-eng/grpc-web/integration_test/go/_proto/improbable/grpcweb/test"
	"golang.org/x/net/context"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/grpclog"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

var (
	http1Port       = flag.Int("http1_port", 9090, "Port to listen with HTTP1.1 with TLS on.")
	http1EmptyPort  = flag.Int("http1_empty_port", 9095, "Port to listen with HTTP1.1 with TLS on with a grpc server that has no services.")
	http2Port       = flag.Int("http2_port", 9100, "Port to listen with HTTP2 with TLS on.")
	http2EmptyPort  = flag.Int("http2_empty_port", 9105, "Port to listen with HTTP2 with TLS on with a grpc server that has no services.")
	tlsCertFilePath = flag.String("tls_cert_file", "../../../misc/localhost.crt", "Path to the CRT/PEM file.")
	tlsKeyFilePath  = flag.String("tls_key_file", "../../../misc/localhost.key", "Path to the private key file.")
)

func main() {
	flag.Parse()

	grpcServer := grpc.NewServer()
	testServer := &testSrv{
		streamsMutex: &sync.Mutex{},
		streams:      map[string]chan bool{},
	}
	testproto.RegisterTestServiceServer(grpcServer, testServer)
	testproto.RegisterTestUtilServiceServer(grpcServer, testServer)
	grpclog.SetLogger(log.New(os.Stdout, "testserver: ", log.LstdFlags))

	websocketOriginFunc := grpcweb.WithWebsocketOriginFunc(func(req *http.Request) bool {
		return true
	})
	httpOriginFunc := grpcweb.WithOriginFunc(func(origin string) bool {
		return true
	})

	wrappedServer := grpcweb.WrapServer(
		grpcServer,
		grpcweb.WithWebsockets(true),
		httpOriginFunc,
		websocketOriginFunc,
	)
	handler := func(resp http.ResponseWriter, req *http.Request) {
		wrappedServer.ServeHTTP(resp, req)
	}

	emptyGrpcServer := grpc.NewServer()
	emptyWrappedServer := grpcweb.WrapServer(
		emptyGrpcServer,
		grpcweb.WithWebsockets(true),
		grpcweb.WithCorsForRegisteredEndpointsOnly(false),
		httpOriginFunc,
		websocketOriginFunc,
	)
	emptyHandler := func(resp http.ResponseWriter, req *http.Request) {
		emptyWrappedServer.ServeHTTP(resp, req)
	}

	http1Server := http.Server{
		Addr:    fmt.Sprintf(":%d", *http1Port),
		Handler: http.HandlerFunc(handler),
	}
	http1Server.TLSNextProto = map[string]func(*http.Server, *tls.Conn, http.Handler){} // Disable HTTP2
	http1EmptyServer := http.Server{
		Addr: fmt.Sprintf(":%d", *http1EmptyPort),
		Handler: http.HandlerFunc(func(res http.ResponseWriter, req *http.Request) {
			emptyHandler(res, req)
		}),
	}
	http1EmptyServer.TLSNextProto = map[string]func(*http.Server, *tls.Conn, http.Handler){} // Disable HTTP2

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
		if err := http1EmptyServer.ListenAndServeTLS(*tlsCertFilePath, *tlsKeyFilePath); err != nil {
			grpclog.Fatalf("failed starting http1.1 empty server: %v", err)
		}
	}()

	// Start the Http1.1 server
	go func() {
		if err := http1Server.ListenAndServeTLS(*tlsCertFilePath, *tlsKeyFilePath); err != nil {
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
	streamsMutex *sync.Mutex
	streams      map[string]chan bool
	testproto.UnimplementedTestServiceServer
	testproto.UnimplementedTestUtilServiceServer
}

func (s *testSrv) PingEmpty(ctx context.Context, _ *google_protobuf.Empty) (*testproto.PingResponse, error) {
	grpc.SendHeader(ctx, metadata.Pairs("HeaderTestKey1", "ServerValue1", "HeaderTestKey2", "ServerValue2"))
	grpc.SetTrailer(ctx, metadata.Pairs("TrailerTestKey1", "ServerValue1", "TrailerTestKey2", "ServerValue2"))
	return &testproto.PingResponse{Value: "foobar"}, nil
}

func (s *testSrv) Ping(ctx context.Context, ping *testproto.PingRequest) (*testproto.PingResponse, error) {
	if ping.GetCheckMetadata() {
		md, ok := metadata.FromIncomingContext(ctx)
		if !ok || md["headertestkey1"][0] != "ClientValue1" || md["headertestkey2"][0] != "ClientValue2" {
			return nil, status.Errorf(codes.InvalidArgument, "Metadata was invalid")
		}
	}
	if ping.GetSendHeaders() {
		grpc.SendHeader(ctx, metadata.Pairs("HeaderTestKey1", "ServerValue1", "HeaderTestKey2", "ServerValue2"))
	}
	if ping.GetSendTrailers() {
		grpc.SetTrailer(ctx, metadata.Pairs("TrailerTestKey1", "ServerValue1", "TrailerTestKey2", "ServerValue2"))
	}
	return &testproto.PingResponse{Value: ping.Value, Counter: 252}, nil
}

func (s *testSrv) Echo(ctx context.Context, text *testproto.TextMessage) (*testproto.TextMessage, error) {
	if text.GetSendHeaders() {
		grpc.SendHeader(ctx, metadata.Pairs("HeaderTestKey1", "ServerValue1", "HeaderTestKey2", "ServerValue2"))
	}
	if text.GetSendTrailers() {
		grpc.SetTrailer(ctx, metadata.Pairs("TrailerTestKey1", "ServerValue1", "TrailerTestKey2", "ServerValue2"))
	}
	return text, nil
}

func (s *testSrv) PingError(ctx context.Context, ping *testproto.PingRequest) (*google_protobuf.Empty, error) {
	if ping.GetSendHeaders() {
		grpc.SendHeader(ctx, metadata.Pairs("HeaderTestKey1", "ServerValue1", "HeaderTestKey2", "ServerValue2"))
	}
	if ping.GetSendTrailers() {
		grpc.SetTrailer(ctx, metadata.Pairs("TrailerTestKey1", "ServerValue1", "TrailerTestKey2", "ServerValue2"))
	}
	var msg = "💣"
	if ping.FailureType == testproto.PingRequest_CODE {
		msg = "Intentionally returning error for PingError"
	}
	return nil, status.Errorf(codes.Code(ping.ErrorCodeReturned), msg)
}

func (s *testSrv) ContinueStream(ctx context.Context, req *testproto.ContinueStreamRequest) (*google_protobuf.Empty, error) {
	s.streamsMutex.Lock()
	channel, ok := s.streams[req.GetStreamIdentifier()]
	s.streamsMutex.Unlock()
	if !ok {
		return nil, status.Errorf(codes.NotFound, fmt.Sprintf("stream identifier not found: %s", req.GetStreamIdentifier()))
	}
	channel <- true
	return &google_protobuf.Empty{}, nil
}

func (s *testSrv) CheckStreamClosed(ctx context.Context, req *testproto.CheckStreamClosedRequest) (*testproto.CheckStreamClosedResponse, error) {
	s.streamsMutex.Lock()
	defer s.streamsMutex.Unlock()
	_, ok := s.streams[req.GetStreamIdentifier()]
	if !ok {
		return &testproto.CheckStreamClosedResponse{
			Closed: true,
		}, nil
	}
	return &testproto.CheckStreamClosedResponse{
		Closed: false,
	}, nil
}

func (s *testSrv) PingList(ping *testproto.PingRequest, stream testproto.TestService_PingListServer) error {
	if ping.GetSendHeaders() {
		stream.SendHeader(metadata.Pairs("HeaderTestKey1", "ServerValue1", "HeaderTestKey2", "ServerValue2"))
	}
	if ping.GetSendTrailers() {
		stream.SetTrailer(metadata.Pairs("TrailerTestKey1", "ServerValue1", "TrailerTestKey2", "ServerValue2"))
	}

	var channel chan bool
	useChannel := ping.GetStreamIdentifier() != ""
	if useChannel {
		channel = make(chan bool, 10000)
		s.streamsMutex.Lock()
		s.streams[ping.GetStreamIdentifier()] = channel
		s.streamsMutex.Unlock()

		defer func() {
			// When this stream has ended
			s.streamsMutex.Lock()
			delete(s.streams, ping.GetStreamIdentifier())
			close(channel)
			s.streamsMutex.Unlock()
		}()
	}

	for i := int32(0); i < ping.ResponseCount; i++ {
		if i != 0 && useChannel {
			select {
			case shouldContinue := <-channel:
				if !shouldContinue {
					return status.Errorf(codes.Canceled, "stream was cancelled by side-channel")
				}
			case <-stream.Context().Done():
				return status.Errorf(codes.Canceled, "stream context ended")
			}
		}
		err := stream.Context().Err()
		if err != nil {
			return status.Errorf(codes.Canceled, "client cancelled stream")
		}
		sendErr := stream.Send(&testproto.PingResponse{Value: fmt.Sprintf("%s %d", ping.Value, i), Counter: i})
		if sendErr != nil {
			// If there was a send error then stop the test server non-gracefully to ensure tests fail in an
			// identifiable way
			panic(sendErr)
		}
	}
	return nil
}

func (s *testSrv) PingStream(stream testproto.TestService_PingStreamServer) error {
	allValues := ""
	for {
		in, err := stream.Recv()
		if err == io.EOF {
			stream.SendAndClose(&testproto.PingResponse{
				Value: allValues,
			})
			return nil
		}
		if err != nil {
			return err
		}
		if in.GetSendHeaders() {
			stream.SendHeader(metadata.Pairs("HeaderTestKey1", "ServerValue1", "HeaderTestKey2", "ServerValue2"))
		}
		if in.GetSendTrailers() {
			stream.SetTrailer(metadata.Pairs("TrailerTestKey1", "ServerValue1", "TrailerTestKey2", "ServerValue2"))
		}
		if allValues == "" {
			allValues = in.GetValue()
		} else {
			allValues = allValues + "," + in.GetValue()
		}
		if in.FailureType == testproto.PingRequest_CODE {
			return status.Errorf(codes.Code(in.ErrorCodeReturned), "Intentionally returning status code: %d", in.ErrorCodeReturned)
		}
	}
}

func (s *testSrv) PingPongBidi(stream testproto.TestService_PingPongBidiServer) error {
	for {
		in, err := stream.Recv()
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return err
		}
		if in.GetSendHeaders() {
			stream.SendHeader(metadata.Pairs("HeaderTestKey1", "ServerValue1", "HeaderTestKey2", "ServerValue2"))
		}
		if in.GetSendTrailers() {
			stream.SetTrailer(metadata.Pairs("TrailerTestKey1", "ServerValue1", "TrailerTestKey2", "ServerValue2"))
		}
		if in.FailureType == testproto.PingRequest_CODE {
			if in.ErrorCodeReturned == 0 {
				return nil
			}
			return status.Errorf(codes.Code(in.ErrorCodeReturned), "Intentionally returning status code: %d", in.ErrorCodeReturned)
		}
		sendErr := stream.Send(&testproto.PingResponse{
			Value: in.Value,
		})
		if sendErr != nil {
			// If there was a send error then stop the test server non-gracefully to ensure tests fail in an
			// identifiable way
			panic(sendErr)
		}
	}
}
