package grpcweb

import (
	"net/http"
	"strings"
)

type header map[string][]string

func (h header) Add(key, value string) {
	lowerKey := strings.ToLower(key)
	h[lowerKey] = append(h[lowerKey], value)
}

func (h header) toHTTPHeader() http.Header {
	return http.Header(h)
}
