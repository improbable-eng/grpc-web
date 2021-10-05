package grpcweb

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"google.golang.org/grpc"
	grpcbackoff "google.golang.org/grpc/backoff"
	"google.golang.org/grpc/codes"
	healthpb "google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/status"
)

// Since grpc DefaultExponential backoff is a part of grpc/internal package we
// cannot import it directly. The following code is a simplified copy of
// https://pkg.go.dev/google.golang.org/grpc/internal/backoff
type exponentialBackoff struct {
	Config  grpcbackoff.Config
	randSrc *rand.Rand
}

func newDefaultExponentialBackoff() exponentialBackoff {
	return exponentialBackoff{
		Config:  grpcbackoff.DefaultConfig,
		randSrc: rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

func (bc exponentialBackoff) backoff(retries int) time.Duration {
	if retries == 0 {
		return bc.Config.BaseDelay
	}
	backoff, max := float64(bc.Config.BaseDelay), float64(bc.Config.MaxDelay)
	for backoff < max && retries > 0 {
		backoff *= bc.Config.Multiplier
		retries--
	}
	if backoff > max {
		backoff = max
	}
	// Randomize backoff delays so that if a cluster of requests start at
	// the same time, they won't operate in lockstep.
	backoff *= 1 + bc.Config.Jitter*(bc.randSrc.Float64()*2-1)
	if backoff < 0 {
		return 0
	}
	return time.Duration(backoff)
}

func (bc exponentialBackoff) backoffOrStop(ctx context.Context, retries int) bool {
	d := bc.backoff(retries)
	timer := time.NewTimer(d)
	select {
	case <-timer.C:
		return true
	case <-ctx.Done():
		timer.Stop()
		return false
	}
}

const healthCheckMethod = "/grpc.health.v1.Health/Watch"

// Client health check function is also part of the grpc/internal package
// The following code is a simplified copy of client go
// For more details see: https://pkg.go.dev/google.golang.org/grpc/health
func ClientHealthCheck(ctx context.Context, backendConn *grpc.ClientConn, service string, setServingStatus func(serving bool)) error {
	tryCnt := 0
	backoffSrc := newDefaultExponentialBackoff()
	healthClient := healthpb.NewHealthClient(backendConn)

retryConnection:
	for {
		// Backs off if the connection has failed in some way without receiving a message in the previous retry.
		if tryCnt > 0 && !backoffSrc.backoffOrStop(ctx, tryCnt-1) {
			return nil
		}
		tryCnt++

		if ctx.Err() != nil {
			return nil
		}
		req := healthpb.HealthCheckRequest{Service: service}
		rawS, err := healthClient.Watch(ctx, &req)

		if err != nil {
			continue retryConnection
		}

		s, ok := rawS.(grpc.ClientStream)
		// Ideally, this should never happen. But if it happens, the server is marked as healthy for LBing purposes.
		if !ok {
			setServingStatus(true)
			retErr := fmt.Errorf("newStream returned %v (type %T); want grpc.ClientStream", rawS, rawS)
			return retErr
		}

		resp := new(healthpb.HealthCheckResponse)
		for {
			err = s.RecvMsg(resp)

			// Reports healthy for the LBing purposes if health check is not implemented in the server.
			if status.Code(err) == codes.Unimplemented {
				setServingStatus(true)
				return err
			}

			// Reports unhealthy if server's Watch method gives an error other than UNIMPLEMENTED.
			if err != nil {
				setServingStatus(false)
				continue retryConnection
			}

			// As a message has been received, removes the need for backoff for the next retry by resetting the try count.
			tryCnt = 0
			if resp.Status == healthpb.HealthCheckResponse_SERVING {
				setServingStatus(true)
			} else {
				setServingStatus(false)
			}
		}
	}
}
