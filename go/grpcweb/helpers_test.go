//Copyright 2017 Improbable. All Rights Reserved.
// See LICENSE for licensing terms.

package grpcweb_test

import (
	"net/http/httptest"
	"sort"
	"testing"

	testproto "github.com/improbable-eng/grpc-web/integration_test/go/_proto/improbable/grpcweb/test"

	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"github.com/stretchr/testify/assert"
	"google.golang.org/grpc"
)

func TestListGRPCResources(t *testing.T) {
	server := grpc.NewServer()
	testproto.RegisterTestServiceServer(server, &testServiceImpl{})
	expected := []string{
		"/improbable.grpcweb.test.TestService/PingEmpty",
		"/improbable.grpcweb.test.TestService/Ping",
		"/improbable.grpcweb.test.TestService/PingError",
		"/improbable.grpcweb.test.TestService/PingList",
		"/improbable.grpcweb.test.TestService/Echo",
		"/improbable.grpcweb.test.TestService/PingPongBidi",
		"/improbable.grpcweb.test.TestService/PingStream",
	}
	actual := grpcweb.ListGRPCResources(server)
	sort.Strings(expected)
	sort.Strings(actual)
	assert.EqualValues(t,
		expected,
		actual,
		"list grpc resources must provide an exhaustive list of all registered handlers")
}

func TestGetGRPCEndpoint(t *testing.T) {
	cases := []struct {
		input  string
		output string
	}{
		{input: "/", output: "/"},
		{input: "/resource", output: "/resource"},
		{input: "/improbable.grpcweb.test.TestService/PingEmpty", output: "/improbable.grpcweb.test.TestService/PingEmpty"},
		{input: "/improbable.grpcweb.test.TestService/PingEmpty/", output: "/improbable.grpcweb.test.TestService/PingEmpty"},
		{input: "/a/b/c/improbable.grpcweb.test.TestService/PingEmpty", output: "/improbable.grpcweb.test.TestService/PingEmpty"},
		{input: "/a/b/c/improbable.grpcweb.test.TestService/PingEmpty/", output: "/improbable.grpcweb.test.TestService/PingEmpty"},
	}

	for _, c := range cases {
		req := httptest.NewRequest("GET", c.input, nil)
		result := grpcweb.GetGRPCEndpoint(req)

		assert.Equal(t, c.output, result)
	}
}
