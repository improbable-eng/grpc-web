//Copyright 2018 Improbable. All Rights Reserved.
// See LICENSE for licensing terms.

package grpcweb

import (
	"net/http"
	"strings"
)

// gRPC-Web spec says that must use lower-case header/trailer names.
// See "HTTP wire protocols" section in
// https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md#protocol-differences-vs-grpc-over-http2
type trailer struct {
	http.Header
}

func (t trailer) Add(key, value string) {
	lowerKey := strings.ToLower(key)

	// If trailer headers, map to lower these keys.
	if lowerKey == "trailer" {
		value = strings.ToLower(value)
	}
	t.Header[lowerKey] = append(t.Header[lowerKey], value)
}
