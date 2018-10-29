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
	h.Header[lowerKey] = append(h.Header[lowerKey], value)
}

func (h header) toHTTPHeader() http.Header {
	return h.Header
}
