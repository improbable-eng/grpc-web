// Copyright 2017 Michal Witkowski. All Rights Reserved.
// See LICENSE for licensing terms.

package grpcweb

import (
	"net/http"

	"google.golang.org/grpc"
	"strings"
)

const (
	hdGrpcCompat = "Grpc-Browser-Compat"
)

// WrapServer takes a gRPC Server in Go and returns an http.HandlerFunc that adds gRPC-Web Compatibility.
//
// The internal implementation fakes out a http.Request that carries standard gRPC, and performs the remapping inside
// http.ResponseWriter, i.e. mostly the re-encoding of Trailers (that carry gRPC status).
func WrapServer(server *grpc.Server) http.HandlerFunc {
	return func(resp http.ResponseWriter, req *http.Request) {
		// Short circuit if a normal gRPC request.
		if req.ProtoMajor == 2 && !isGrpcWebRequest(req.Header) {
			server.ServeHTTP(resp, req)
			return
		}
		intReq := hackIntoNormalGrpcRequest(req)
		intResp := newGrpcWebResponse(resp)
		server.ServeHTTP(intResp, intReq)
		intResp.finishRequest(req)
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
