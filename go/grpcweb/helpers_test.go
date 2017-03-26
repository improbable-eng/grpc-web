//Copyright 2017 Improbable. All Rights Reserved.
// See LICENSE for licensing terms.

package grpcweb_test

import (
	"testing"
	testproto "../../test/go/_proto/improbable/grpcweb/test"

	"google.golang.org/grpc"
	"github.com/stretchr/testify/assert"
	"github.com/improbable-eng/grpc-web/go/grpcweb"
)

func TestListGRPCResources(t *testing.T) {
	server := grpc.NewServer()
	testproto.RegisterTestServiceServer(server, &testServiceImpl{})
	expected := []string{
		"/improbable.grpcweb.test.TestService/PingEmpty",
		"/improbable.grpcweb.test.TestService/Ping",
		"/improbable.grpcweb.test.TestService/PingError",
		"/improbable.grpcweb.test.TestService/PingList",
	}
	assert.EqualValues(t,
		expected,
		grpcweb.ListGRPCResources(server),
		"list grpc resources must provide an exhaustive list of all registered handlers")
}
