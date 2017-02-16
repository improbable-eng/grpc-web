
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
	grpc.SendHeader(ctx, metadata.Pairs("HeaderTestKey1", "Value1", "HeaderTestKey2", "Value2"))
	grpclog.Printf("Handling PingEmpty")
	grpc.SetTrailer(ctx, metadata.Pairs("TrailerTestKey1", "Value1", "TrailerTestKey2", "Value2"))
	return &PingResponse{Value: "foobar"}, nil
}

func (s *TestServiceImpl) Ping(ctx context.Context, ping *PingRequest) (*PingResponse, error) {
	grpc.SendHeader(ctx, metadata.Pairs("HeaderTestKey1", "Value1", "HeaderTestKey2", "Value2"))
	grpclog.Printf("Handling Ping")
	grpc.SetTrailer(ctx, metadata.Pairs("TrailerTestKey1", "Value1", "TrailerTestKey2", "Value2"))
	return &PingResponse{Value: ping.Value}, nil
}

func (s *TestServiceImpl) PingError(ctx context.Context, ping *PingRequest) (*Empty, error) {
	grpc.SendHeader(ctx, metadata.Pairs("HeaderTestKey1", "Value1", "HeaderTestKey2", "Value2"))
	grpclog.Printf("Handling PingError")
	grpc.SetTrailer(ctx, metadata.Pairs("TrailerTestKey1", "Value1", "TrailerTestKey2", "Value2"))
	return nil, grpc.Errorf(codes.Unimplemented, "Not implemented PingError")
}

func (s *TestServiceImpl) PingList(ping *PingRequest, stream TestService_PingListServer) error {
	stream.SendHeader(metadata.Pairs("HeaderTestKey1", "Value1", "HeaderTestKey2", "Value2"))
	stream.SetTrailer(metadata.Pairs("TrailerTestKey1", "Value1", "TrailerTestKey2", "Value2"))
	grpclog.Printf("Handling PingList")
	for i := int32(0); i < 3000; i++ {
		stream.Send(&PingResponse{Value: fmt.Sprintf("%s %d", ping.Value, i), Counter: i})
	}
	return nil
}
