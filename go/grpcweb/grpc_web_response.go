//Copyright 2017 Improbable. All Rights Reserved.
// See LICENSE for licensing terms.

package grpcweb

import (
	"bytes"
	"encoding/binary"
	"net/http"
	"strings"

	"golang.org/x/net/http2"
)

// grpcWebResponse implements http.ResponseWriter.
type grpcWebResponse struct {
	wroteHeaders bool
	headers      http.Header
	wrapped      http.ResponseWriter
}

func newGrpcWebResponse(resp http.ResponseWriter) *grpcWebResponse {
	return &grpcWebResponse{headers: make(http.Header), wrapped: resp}
}

func (w *grpcWebResponse) Header() http.Header {
	return w.headers
}

func (w *grpcWebResponse) Write(b []byte) (int, error) {
	return w.wrapped.Write(b)
}

func (w *grpcWebResponse) WriteHeader(code int) {
	w.copyJustHeadersToWrapped()
	w.writeCorsExposedHeaders()
	w.wrapped.WriteHeader(code)
	w.wroteHeaders = true
}

func (w *grpcWebResponse) Flush() {
	if w.wroteHeaders {
		// Work around the fact that WriteHeader and a call to Flush would have caused a 200 response.
		// This is the case when there is no payload.
		w.wrapped.(http.Flusher).Flush()
	}
}

func (w *grpcWebResponse) CloseNotify() <-chan bool {
	return w.wrapped.(http.CloseNotifier).CloseNotify()
}

func (w *grpcWebResponse) copyJustHeadersToWrapped() {
	wrappedHeader := w.wrapped.Header()
	for k, vv := range w.headers {
		// Skip the pre-annoucement of Trailer headers. Don't add them to the response headers.
		if strings.ToLower(k) == "trailer" {
			continue
		}
		for _, v := range vv {
			wrappedHeader.Add(k, v)
		}
	}
}

func (w *grpcWebResponse) finishRequest(req *http.Request) {
	if w.wroteHeaders {
		w.copyTrailersToPayload()
	} else {
		w.copyTrailersAndHeadersToWrapped()
	}
}

func (w *grpcWebResponse) copyTrailersAndHeadersToWrapped() {
	w.wroteHeaders = true
	wrappedHeader := w.wrapped.Header()
	for k, vv := range w.headers {
		// Skip the pre-annoucement of Trailer headers. Don't add them to the response headers.
		if strings.ToLower(k) == "trailer" {
			continue
		}
		// Skip the Trailer prefix
		if strings.HasPrefix(k, http2.TrailerPrefix) {
			k = k[len(http2.TrailerPrefix):]
		}
		for _, v := range vv {
			wrappedHeader.Add(k, v)
		}
	}
	w.writeCorsExposedHeaders()
	w.wrapped.WriteHeader(http.StatusOK)
	w.wrapped.(http.Flusher).Flush()
}

func (w *grpcWebResponse) writeCorsExposedHeaders() {
	// These cors handlers are added to the *response*, not a preflight.
	knownHeaders := []string{}
	for h, _ := range w.wrapped.Header() {
		knownHeaders = append(knownHeaders, http.CanonicalHeaderKey(h))
	}
	w.wrapped.Header().Set("Access-Control-Expose-Headers", strings.Join(knownHeaders, ", "))
}

func (w *grpcWebResponse) copyTrailersToPayload() {
	trailers := w.extractTrailerHeaders()
	trailerBuffer := new(bytes.Buffer)
	trailers.Write(trailerBuffer)
	trailerGrpcDataHeader := []byte{1 << 7, 0, 0, 0, 0} // MSB=1 indicates this is a trailer data frame.
	binary.BigEndian.PutUint32(trailerGrpcDataHeader[1:5], uint32(trailerBuffer.Len()))
	w.wrapped.Write(trailerGrpcDataHeader)
	w.wrapped.Write(trailerBuffer.Bytes())
	w.wrapped.(http.Flusher).Flush()
}

func (w *grpcWebResponse) extractTrailerHeaders() http.Header {
	flushedHeaders := w.wrapped.Header()
	trailerHeaders := make(http.Header)
	for k, vv := range w.headers {
		// Skip the pre-annoucement of Trailer headers. Don't add them to the response headers.
		if strings.ToLower(k) == "trailer" {
			continue
		}
		// Skip existing headers that were already sent.
		if _, exists := flushedHeaders[k]; exists {
			continue
		}
		// Skip the Trailer prefix
		if strings.HasPrefix(k, http2.TrailerPrefix) {
			k = k[len(http2.TrailerPrefix):]
		}
		for _, v := range vv {
			trailerHeaders.Add(k, v)
		}
	}
	return trailerHeaders
}
