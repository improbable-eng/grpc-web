//Copyright 2017 Improbable. All Rights Reserved.
// See LICENSE for licensing terms.

package grpcweb

import (
	"net/http"

	"strings"
	"time"

	"github.com/rs/cors"
	"google.golang.org/grpc"
)

var (
	internalRequestHeadersWhitelist = []string{
		"U-A", // for gRPC-Web User Agent indicator.
	}
)

type WrappedGrpcServer struct {
	server      *grpc.Server
	opts        *options
	corsWrapper *cors.Cors
}

// WrapServer takes a gRPC Server in Go and returns a WrappedGrpcServer that provides gRPC-Web Compatibility.
//
// The internal implementation fakes out a http.Request that carries standard gRPC, and performs the remapping inside
// http.ResponseWriter, i.e. mostly the re-encoding of Trailers (that carry gRPC status).
//
// You can control the behaviour of the wrapper (e.g. modifying CORS behaviour) using `With*` options.
func WrapServer(server *grpc.Server, options ...Option) *WrappedGrpcServer {
	opts := evaluateOptions(options)
	corsWrapper := cors.New(cors.Options{
		AllowOriginFunc:  opts.originFunc,
		AllowedHeaders:   append(opts.allowedRequestHeaders, internalRequestHeadersWhitelist...),
		ExposedHeaders:   nil,                                 // make sure that this is *nil*, otherwise the WebResponse overwrite will not work.
		AllowCredentials: true,                                // always allow credentials, otherwise :authorization headers won't work
		MaxAge:           int(10 * time.Minute / time.Second), // make sure pre-flights don't happen too often (every 5s for Chromium :( )
	})
	return &WrappedGrpcServer{
		server:      server,
		opts:        opts,
		corsWrapper: corsWrapper,
	}
}

// ServeHttp takes a HTTP request and if it is a gRPC-Web request wraps it with a compatibility layer to transform it to
// a standard gRPC request for the wrapped gRPC server and transforms the response to comply with the gRPC-Web protocol.
//
// The gRPC-Web compatibility is only invoked if the request is a gRPC-Web request as determined by IsGrpcWebRequest or
// the request is a pre-flight (CORS) request as determined by IsAcceptableGrpcCorsRequest.
//
// You can control the CORS behaviour using `With*` options in the WrapServer function.
func (w *WrappedGrpcServer) ServeHttp(resp http.ResponseWriter, req *http.Request) {
	if w.IsAcceptableGrpcCorsRequest(req) || w.IsGrpcWebRequest(req) {
		w.corsWrapper.Handler(http.HandlerFunc(w.HandleGrpcWebRequest)).ServeHTTP(resp, req)
		return
	}
	w.server.ServeHTTP(resp, req)
}

// HandleGrpcWebRequest takes a HTTP request that is assumed to be a gRPC-Web request and wraps it with a compatibility
// layer to transform it to a standard gRPC request for the wrapped gRPC server and transforms the response to comply
// with the gRPC-Web protocol.
func (w *WrappedGrpcServer) HandleGrpcWebRequest(resp http.ResponseWriter, req *http.Request) {
	intReq := hackIntoNormalGrpcRequest(req)
	intResp := newGrpcWebResponse(resp)
	w.server.ServeHTTP(intResp, intReq)
	intResp.finishRequest(req)
}

// IsGrpcWebRequest determines if a request is a gRPC-Web request by checking that the "content-type" is
// "application/grpc-web" and that the method is POST.
func (w *WrappedGrpcServer) IsGrpcWebRequest(req *http.Request) bool {
	return req.Method == http.MethodPost && strings.HasPrefix(req.Header.Get("content-type"), "application/grpc-web")
}

// IsAcceptableGrpcCorsRequest determines if a request is a CORS pre-flight request for a gRPC-Web request and that this
// request is acceptable for CORS.
//
// You can control the CORS behaviour using `With*` options in the WrapServer function.
func (w *WrappedGrpcServer) IsAcceptableGrpcCorsRequest(req *http.Request) bool {
	accessControlHeaders := strings.ToLower(req.Header.Get("Access-Control-Request-Headers"))
	if req.Method == http.MethodOptions && strings.Contains(accessControlHeaders, "x-grpc-web") {
		if w.opts.corsForRegisteredEndpointsOnly {
			return w.isRequestForRegisteredEndpoint(req)
		}
		return true
	}
	return false
}

func (w *WrappedGrpcServer) isRequestForRegisteredEndpoint(req *http.Request) bool {
	registeredEndpoints := ListGRPCResources(w.server)
	requestedEndpoint := req.URL.Path
	for _, v := range registeredEndpoints {
		if v == requestedEndpoint {
			return true
		}
	}
	return false
}

func hackIntoNormalGrpcRequest(req *http.Request) *http.Request {
	// Hack, this should be a shallow copy, but let's see if this works
	req.ProtoMajor = 2
	req.ProtoMinor = 0
	contentType := req.Header.Get("content-type")
	req.Header.Set("content-type", strings.Replace(contentType, "application/grpc-web", "application/grpc", 1))
	return req
}
