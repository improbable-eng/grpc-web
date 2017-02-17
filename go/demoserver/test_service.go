package main

import (
	"fmt"

	context "golang.org/x/net/context"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc"
	"google.golang.org/grpc/grpclog"
	"google.golang.org/grpc/metadata"
	testproto "github.com/mwitkow/grpc-web/go/_proto/mwitkow/grpcweb/test"
)

type demoTestService struct {
}

func (s *demoTestService) PingEmpty(ctx context.Context, _ *testproto.Empty) (*testproto.PingResponse, error) {
	grpc.SendHeader(ctx, metadata.Pairs("HeaderTestKey1", "Value1", "HeaderTestKey2", "Value2"))
	grpclog.Printf("demoTestService.PingEmpty invoked")
	grpc.SetTrailer(ctx, metadata.Pairs("TrailerTestKey1", "Value1", "TrailerTestKey2", "Value2"))
	return &testproto.PingResponse{Value: "foobar"}, nil
}

func (s *demoTestService) Ping(ctx context.Context, ping *testproto.PingRequest) (*testproto.PingResponse, error) {
	grpc.SendHeader(ctx, metadata.Pairs("HeaderTestKey1", "Value1", "HeaderTestKey2", "Value2"))
	grpclog.Printf("demoTestService.Ping invoked")
	grpc.SetTrailer(ctx, metadata.Pairs("TrailerTestKey1", "Value1", "TrailerTestKey2", "Value2"))
	return &testproto.PingResponse{Value: ping.Value}, nil
}

func (s *demoTestService) PingError(ctx context.Context, ping *testproto.PingRequest) (*testproto.Empty, error) {
	grpc.SendHeader(ctx, metadata.Pairs("HeaderTestKey1", "Value1", "HeaderTestKey2", "Value2"))
	grpclog.Printf("demoTestService.PingError invoked")
	grpc.SetTrailer(ctx, metadata.Pairs("TrailerTestKey1", "Value1", "TrailerTestKey2", "Value2"))
	return nil, grpc.Errorf(codes.Unimplemented, "Not implemented PingError")
}

func (s *demoTestService) PingList(ping *testproto.PingRequest, stream testproto.TestService_PingListServer) error {
	stream.SendHeader(metadata.Pairs("HeaderTestKey1", "Value1", "HeaderTestKey2", "Value2"))
	stream.SetTrailer(metadata.Pairs("TrailerTestKey1", "Value1", "TrailerTestKey2", "Value2"))
	grpclog.Printf("demoTestService.PingList invoked")
	for i := int32(0); i < 3000; i++ {
		stream.Send(&testproto.PingResponse{Value: fmt.Sprintf("%s %d", ping.Value, i), Counter: i})
	}
	return nil
}
