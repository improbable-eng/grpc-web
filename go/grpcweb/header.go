package grpcweb

import (
	"net/http"
	"strings"
)

type header struct {
	http.Header
}

func (h header) Add(key, value string) {
	lowerKey := strings.ToLower(key)

	// If trailer headers, map to lower these keys.
	if lowerKey == "trailer" {
		value = strings.ToLower(value)
	}
	h.Header[lowerKey] = append(h.Header[lowerKey], value)
}

func (h header) toHTTPHeader() http.Header {
	return h.Header
}
