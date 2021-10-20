package grpcweb_test

import (
	"context"
	"net"
	"testing"
	"time"

	"github.com/improbable-eng/grpc-web/go/grpcweb"
	testproto "github.com/improbable-eng/grpc-web/integration_test/go/_proto/improbable/grpcweb/test"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	healthpb "google.golang.org/grpc/health/grpc_health_v1"
)

func TestClientWithNoHealthServiceOnServer(t *testing.T) {
	// Set up and run a server with no health check handler registered
	grpcServer := grpc.NewServer()
	testproto.RegisterTestServiceServer(grpcServer, &testServiceImpl{})
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)

	go func() {
		_ = grpcServer.Serve(listener)
	}()
	t.Cleanup(grpcServer.Stop)

	grpcClientConn, err := grpc.Dial(listener.Addr().String(),
		grpc.WithBlock(),
		grpc.WithTimeout(100*time.Millisecond),
		grpc.WithInsecure(),
	)
	require.NoError(t, err)

	ctx := context.Background()

	servingStatus := true
	err = grpcweb.ClientHealthCheck(ctx, grpcClientConn, "", func(serving bool) {
		servingStatus = serving
	})
	assert.Error(t, err)
	assert.False(t, servingStatus)
}

type clientHealthTestData struct {
	listener     net.Listener
	serving      bool
	healthServer *health.Server
}

func setupTestData(t *testing.T) clientHealthTestData {
	s := clientHealthTestData{}

	grpcServer := grpc.NewServer()
	s.healthServer = health.NewServer()
	healthpb.RegisterHealthServer(grpcServer, s.healthServer)

	var err error
	s.listener, err = net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)

	go func() {
		grpcServer.Serve(s.listener)
	}()
	t.Cleanup(grpcServer.Stop)

	return s
}

func (s *clientHealthTestData) dialBackend(t *testing.T) *grpc.ClientConn {
	grpcClientConn, err := grpc.Dial(s.listener.Addr().String(),
		grpc.WithBlock(),
		grpc.WithTimeout(100*time.Millisecond),
		grpc.WithInsecure(),
	)
	require.NoError(t, err)
	return grpcClientConn
}

func (s *clientHealthTestData) checkServingStatus(t *testing.T, expStatus bool) {
	for start := time.Now(); time.Since(start) < 100*time.Millisecond; {
		if s.serving == expStatus {
			break
		}
	}
	assert.Equal(t, expStatus, s.serving)
}

func (s *clientHealthTestData) startClientHealthCheck(ctx context.Context, conn *grpc.ClientConn) {
	go func() {
		_ = grpcweb.ClientHealthCheck(ctx, conn, "", func(status bool) {
			s.serving = status
		})
	}()
}

func TestClientHealthCheck_FailsIfNotServing(t *testing.T) {
	s := setupTestData(t)

	s.healthServer.SetServingStatus("", healthpb.HealthCheckResponse_NOT_SERVING)

	backendConn := s.dialBackend(t)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	s.startClientHealthCheck(ctx, backendConn)
	s.checkServingStatus(t, false)
}

func TestClientHealthCheck_SucceedsIfServing(t *testing.T) {
	s := setupTestData(t)

	s.healthServer.SetServingStatus("", healthpb.HealthCheckResponse_SERVING)

	backendConn := s.dialBackend(t)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	s.startClientHealthCheck(ctx, backendConn)
	s.checkServingStatus(t, true)
}

func TestClientHealthCheck_ReactsToStatusChange(t *testing.T) {
	s := setupTestData(t)

	s.healthServer.SetServingStatus("", healthpb.HealthCheckResponse_NOT_SERVING)

	backendConn := s.dialBackend(t)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	s.startClientHealthCheck(ctx, backendConn)
	s.checkServingStatus(t, false)

	s.healthServer.SetServingStatus("", healthpb.HealthCheckResponse_SERVING)
	s.checkServingStatus(t, true)

	s.healthServer.SetServingStatus("", healthpb.HealthCheckResponse_NOT_SERVING)
	s.checkServingStatus(t, false)
}
