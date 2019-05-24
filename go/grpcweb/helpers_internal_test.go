package grpcweb

import (
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

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
		result := getGRPCEndpoint(req)

		assert.Equal(t, c.output, result)
	}
}
