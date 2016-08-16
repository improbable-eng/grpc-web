package grpc_browser_compat

import (
	"net/http"

	"google.golang.org/grpc"
)

const (
	hdGrpcCompat = "Grpc-Browser-Compat"
)

func Middleware(server *grpc.Server) http.HandlerFunc {
	return func(resp http.ResponseWriter, req *http.Request) {
		// Short circuit if a normal gRPC request.
		if req.ProtoMajor == 2 && req.Header.Get(hdGrpcCompat) == "" {
			server.ServeHTTP(resp, req)
			return
		}
		intReq := cloneCompatibleRequest(req)
		intResp := newh2CompatResponse(resp)
		server.ServeHTTP(intResp, intReq)
		intResp.copyTrailersToPayload(req)
	}
}

func cloneCompatibleRequest(req *http.Request) *http.Request {
	// Hack, this should be a shallow copy, but let's see if this works
	req.ProtoMajor = 2
	req.ProtoMinor = 0
	req.Header.Del("X-Browser-Compat")
	return req
}
