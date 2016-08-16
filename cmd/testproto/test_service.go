
package mwitkow_testproto

import (
	context "golang.org/x/net/context"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc"
	"google.golang.org/grpc/grpclog"
	"google.golang.org/grpc/metadata"
	"fmt"
)

type TestServiceImpl struct {
}

func (s *TestServiceImpl) PingEmpty(ctx context.Context, _ *Empty) (*PingResponse, error) {
	grpclog.Printf("Handling PingEmpty")
	return &PingResponse{Value: "foobar"}, nil
}

func (s *TestServiceImpl) Ping(ctx context.Context, ping *PingRequest) (*PingResponse, error) {
	grpclog.Printf("Handling Ping")
	return &PingResponse{Value: ping.Value}, nil
}

func (s *TestServiceImpl) PingError(ctx context.Context, ping *PingRequest) (*Empty, error) {
	grpclog.Printf("Handling PingError")
	return nil, grpc.Errorf(codes.Unimplemented, "Not implemented, what are you looking for here?")
}

func (s *TestServiceImpl) PingList(ping *PingRequest, stream TestService_PingListServer) error {
	stream.SetTrailer(metadata.Pairs("MyKey", "MyValue", "SomeKey", "SomeValue"))
	grpclog.Printf("Handling PingList")
	for i := int32(0); i < 3000; i++ {
		stream.Send(&PingResponse{Value: fmt.Sprintf("%s %d", ping.Value, i), Counter: i})
	}
	return nil
}
