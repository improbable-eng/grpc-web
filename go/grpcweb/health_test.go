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

	grpcClientConn, dialErr := grpc.Dial(listener.Addr().String(),
		grpc.WithBlock(),
		grpc.WithTimeout(100*time.Millisecond),
		grpc.WithInsecure(),
	)

	assert.Equal(t, nil, dialErr)

	clientCtx := context.Background()

	servingStatus := true
	expectedErr := grpcweb.ClientHealthCheck(clientCtx, grpcClientConn, "", func(serving bool) {
		servingStatus = serving
	})
	assert.NotEqual(t, nil, expectedErr)
	assert.Equal(t, false, servingStatus)
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

	s.serving = false

	var err error = nil
	s.listener, err = net.Listen("tcp", "127.0.0.1:0")

	require.NoError(t, err)

	go func() {
		grpcServer.Serve(s.listener)
	}()

	t.Cleanup(grpcServer.Stop)

	return s
}

func (s *clientHealthTestData) dialBackend(t *testing.T) *grpc.ClientConn {
	grpcClientConn, dialErr := grpc.Dial(s.listener.Addr().String(),
		grpc.WithBlock(),
		grpc.WithTimeout(100*time.Millisecond),
		grpc.WithInsecure(),
	)
	assert.Equal(t, nil, dialErr)
	return grpcClientConn
}

func (s *clientHealthTestData) setServingStatus(status bool) {
	s.serving = status
}

func (s *clientHealthTestData) checkServingStatus(t *testing.T, expStatus bool) {
	time.Sleep(100 * time.Millisecond) // arbitrary timeout, but should be enough
	assert.Equal(t, expStatus, s.serving)
}

func (s *clientHealthTestData) startClientHealthCheck(ctx context.Context, conn *grpc.ClientConn) {
	go func() {
		_ = grpcweb.ClientHealthCheck(ctx, conn, "", func(status bool) {
			s.setServingStatus(status)
		})
	}()
}

func TestClientHealthCheck_FailsIfNotServing(t *testing.T) {
	s := setupTestData(t)

	s.healthServer.SetServingStatus("", healthpb.HealthCheckResponse_NOT_SERVING)

	backendConn := s.dialBackend(t)
	clientCtx, cancel := context.WithCancel(context.Background())
	defer cancel()

	s.startClientHealthCheck(clientCtx, backendConn)
	s.checkServingStatus(t, false)
}

func TestClientHealthCheck_SucceedsIfServing(t *testing.T) {
	s := setupTestData(t)

	s.healthServer.SetServingStatus("", healthpb.HealthCheckResponse_SERVING)

	backendConn := s.dialBackend(t)
	clientCtx, cancel := context.WithCancel(context.Background())
	defer cancel()

	s.startClientHealthCheck(clientCtx, backendConn)
	s.checkServingStatus(t, true)
}

func TestClientHealthCheck_ReactsToStatusChange(t *testing.T) {
	s := setupTestData(t)

	s.healthServer.SetServingStatus("", healthpb.HealthCheckResponse_NOT_SERVING)

	backendConn := s.dialBackend(t)
	clientCtx, cancel := context.WithCancel(context.Background())
	defer cancel()

	s.startClientHealthCheck(clientCtx, backendConn)
	s.checkServingStatus(t, false)

	s.healthServer.SetServingStatus("", healthpb.HealthCheckResponse_SERVING)
	s.checkServingStatus(t, true)

	s.healthServer.SetServingStatus("", healthpb.HealthCheckResponse_NOT_SERVING)
	s.checkServingStatus(t, false)
}
