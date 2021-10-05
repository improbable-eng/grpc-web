package grpcweb_test

import (
	"context"
	"net"
	"sync"
	"testing"
	"time"

	"github.com/improbable-eng/grpc-web/go/grpcweb"
	testproto "github.com/improbable-eng/grpc-web/integration_test/go/_proto/improbable/grpcweb/test"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	healthpb "google.golang.org/grpc/health/grpc_health_v1"
)

type ClientHealthTestSuite struct {
	suite.Suite
	listener     net.Listener
	cond         sync.Cond
	serving      bool
	healthServer *health.Server
}

func TestClientWithNoHealthServiceOnServer(t *testing.T) {
	// Set up and run a server with no health check handler registered
	grpcServer := grpc.NewServer()
	testproto.RegisterTestServiceServer(grpcServer, &testServiceImpl{})
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	assert.Equal(t, err, nil)

	go func() {
		_ = grpcServer.Serve(listener)
	}()
	time.Sleep(10 * time.Millisecond)

	grpcClientConn, dialErr := grpc.Dial(listener.Addr().String(),
		grpc.WithBlock(),
		grpc.WithTimeout(100*time.Millisecond),
		grpc.WithInsecure(),
	)

	assert.Equal(t, nil, dialErr)

	clientCtx := context.TODO()
	expectedErr := grpcweb.ClientHealthCheck(clientCtx, grpcClientConn, "", func(serving bool) {})
	assert.NotEqual(t, nil, expectedErr)
}

func TestClientHealthCheckSuite(t *testing.T) {
	suite.Run(t, &ClientHealthTestSuite{})
}

func (s *ClientHealthTestSuite) SetupTest() {
	grpcServer := grpc.NewServer()
	s.healthServer = health.NewServer()
	healthpb.RegisterHealthServer(grpcServer, s.healthServer)

	s.cond.L = new(sync.Mutex)
	s.serving = false

	var err error = nil
	s.listener, err = net.Listen("tcp", "127.0.0.1:0")

	assert.Equal(s.T(), err, nil)

	go func() {
		grpcServer.Serve(s.listener)
	}()

	// Wait for the grpcServer to start serving requests.
	time.Sleep(10 * time.Millisecond)
}

func (s *ClientHealthTestSuite) dialBackend() *grpc.ClientConn {
	grpcClientConn, dialErr := grpc.Dial(s.listener.Addr().String(),
		grpc.WithBlock(),
		grpc.WithTimeout(100*time.Millisecond),
		grpc.WithInsecure(),
	)
	assert.Equal(s.T(), nil, dialErr)
	return grpcClientConn
}

func (s *ClientHealthTestSuite) setServingStatus(status bool) {
	s.cond.L.Lock()
	s.serving = status
	s.cond.L.Unlock()
	s.cond.Signal()
}

func (s *ClientHealthTestSuite) checkServingStatus(expStatus bool) {
	s.cond.L.Lock()
	s.cond.Wait()
	defer s.cond.L.Unlock()
	assert.Equal(s.T(), expStatus, s.serving)
}

func (s *ClientHealthTestSuite) startClientHealthCheck(ctx context.Context, conn *grpc.ClientConn) {
	go func() {
		_ = grpcweb.ClientHealthCheck(ctx, conn, "", func(status bool) {
			s.setServingStatus(status)
		})
	}()
}

func (s *ClientHealthTestSuite) TestClientHealthCheck_FailsIfNotServing() {
	s.healthServer.SetServingStatus("", healthpb.HealthCheckResponse_NOT_SERVING)

	backendConn := s.dialBackend()
	clientCtx, cancel := context.WithCancel(context.Background())
	defer cancel()

	s.startClientHealthCheck(clientCtx, backendConn)
	s.checkServingStatus(false)
}

func (s *ClientHealthTestSuite) TestClientHealthCheck_SucceedsIfServing() {
	s.healthServer.SetServingStatus("", healthpb.HealthCheckResponse_SERVING)

	backendConn := s.dialBackend()
	clientCtx, cancel := context.WithCancel(context.Background())
	defer cancel()

	s.startClientHealthCheck(clientCtx, backendConn)
	s.checkServingStatus(true)
}

func (s *ClientHealthTestSuite) TestClientHealthCheck_ReactsToStatusChange() {
	s.healthServer.SetServingStatus("", healthpb.HealthCheckResponse_NOT_SERVING)

	backendConn := s.dialBackend()
	clientCtx, cancel := context.WithCancel(context.Background())
	defer cancel()

	s.startClientHealthCheck(clientCtx, backendConn)
	s.checkServingStatus(false)

	s.healthServer.SetServingStatus("", healthpb.HealthCheckResponse_SERVING)
	s.checkServingStatus(true)

	s.healthServer.SetServingStatus("", healthpb.HealthCheckResponse_NOT_SERVING)
	s.checkServingStatus(false)
}
