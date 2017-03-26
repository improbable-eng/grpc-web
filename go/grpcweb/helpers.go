//Copyright 2017 Improbable. All Rights Reserved.
// See LICENSE for licensing terms.

package grpcweb

import (
	"fmt"
	"net/http"
	"strings"

	"google.golang.org/grpc"
)

// ListGRPCResources is a helper function that lists all URLs that are registered on gRPC server.
//
// This makes it easy to register all the relevant routes in your HTTP router of choice.
func ListGRPCResources(server *grpc.Server) []string {
	ret := []string{}
	for serviceName, serviceInfo := range server.GetServiceInfo() {
		for _, methodInfo := range serviceInfo.Methods {
			fullResource := fmt.Sprintf("/%s/%s", serviceName, methodInfo.Name)
			ret = append(ret, fullResource)
		}
	}
	return ret
}

// IsGrpcRequest checks whether the given request is a gRPC-Web or gRPC-standard request.
func IsGrpcRequest(r *http.Request) bool {
	return strings.HasPrefix(r.Header.Get("content-type"), "application/grpc")
}
