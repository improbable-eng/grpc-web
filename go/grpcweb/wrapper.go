//Copyright 2017 Improbable. All Rights Reserved.
// See LICENSE for licensing terms.

package grpcweb

import (
	"net/http"

	"google.golang.org/grpc"
	"strings"
	"github.com/rs/cors"
	"time"
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
		// Short circuit if a normal gRPC request.
		if req.ProtoMajor == 2 && !isGrpcWebRequest(req.Header) {
			server.ServeHTTP(resp, req)
			return
		}
		corsWrapper.Handler(http.HandlerFunc(grpcWebHandler)).ServeHTTP(resp, req)
	}
}

func isGrpcWebRequest(headers http.Header) bool {
	return strings.HasPrefix(headers.Get("content-type"), "application/grpc-web")
}

func hackIntoNormalGrpcRequest(req *http.Request) *http.Request {
	// Hack, this should be a shallow copy, but let's see if this works
	req.ProtoMajor = 2
	req.ProtoMinor = 0
	contentType := req.Header.Get("content-type")
	req.Header.Set("content-type", strings.Replace(contentType, "application/grpc-web", "application/grpc", 1))
	return req
}
