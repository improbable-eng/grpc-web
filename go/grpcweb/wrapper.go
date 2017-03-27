//Copyright 2017 Improbable. All Rights Reserved.
// See LICENSE for licensing terms.

package grpcweb

import (
	"net/http"

	"strings"
	"time"

	"github.com/rs/cors"
	"google.golang.org/grpc"
	"fmt"
)

var (
	internalRequestHeadersWhitelist = []string{
		"U-A", // for gRPC-Web User Agent indicator.
	}
)

// WrapServer takes a gRPC Server in Go and returns an http.HandlerFunc that adds gRPC-Web Compatibility.
//
// The internal implementation fakes out a http.Request that carries standard gRPC, and performs the remapping inside
// http.ResponseWriter, i.e. mostly the re-encoding of Trailers (that carry gRPC status).
//
// You can control the behaviour of the wrapper (e.g. modifying CORS behaviour) using `With*` options.
func WrapServer(server *grpc.Server, options ...Option) http.HandlerFunc {
	opts := evaluateOptions(options)
	corsWrapper := cors.New(cors.Options{
		AllowOriginFunc:  opts.originFunc,
		AllowedHeaders:   append(opts.allowedRequestHeaders, internalRequestHeadersWhitelist...),
		ExposedHeaders:   nil,                                 // make sure that this is *nil*, otherwise the WebResponse overwrite will not work.
		AllowCredentials: true,                                // always allow credentials, otherwise :authorization headers won't work
		MaxAge:           int(10 * time.Minute / time.Second), // make sure pre-flights don't happen too often (every 5s for Chromium :( )
	})
	grpcWebHandler := func(resp http.ResponseWriter, req *http.Request) {
		intReq := hackIntoNormalGrpcRequest(req)
		intResp := newGrpcWebResponse(resp)
		server.ServeHTTP(intResp, intReq)
		intResp.finishRequest(req)
	}
	return func(resp http.ResponseWriter, req *http.Request) {
		if isGrpcWebRequest(req) || isAcceptableGrpcCorsRequest(req, server, opts) {
			corsWrapper.Handler(http.HandlerFunc(grpcWebHandler)).ServeHTTP(resp, req)
			return
		}
		server.ServeHTTP(resp, req)
	}
}

func isGrpcWebRequest(req *http.Request) bool {
	return strings.HasPrefix(req.Header.Get("content-type"), "application/grpc-web")
}

func isAcceptableGrpcCorsRequest(req *http.Request, server *grpc.Server, opts *options) bool {
	accessControlHeaders := strings.ToLower(req.Header.Get("Access-Control-Request-Headers"))
	if req.Method == http.MethodOptions && strings.Contains(accessControlHeaders, "x-grpc-web") {
		if opts.corsForRegisteredEndpointsOnly {
			return isRequestForRegisteredEndpoint(req, server)
		}
		return true
	}
	return false
}

func isRequestForRegisteredEndpoint(req *http.Request, server *grpc.Server) bool {
	registeredEndpoints := ListGRPCResources(server)
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
