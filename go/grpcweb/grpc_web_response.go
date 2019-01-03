//Copyright 2017 Improbable. All Rights Reserved.
// See LICENSE for licensing terms.

package grpcweb

import (
	"bytes"
	"encoding/base64"
	"encoding/binary"
	"io"
	"net/http"
	"strings"

	"golang.org/x/net/http2"
	"google.golang.org/grpc/grpclog"
)

// grpcWebResponse implements http.ResponseWriter.
type grpcWebResponse struct {
	wroteHeaders bool
	wroteBody    bool
	headers      http.Header
	// Flush must be called on this writer before returning to ensure encoded buffer is flushed
	wrapped http.ResponseWriter

	// The standard "application/grpc" content-type will be replaced with this.
	contentType string
}

func newGrpcWebResponse(resp http.ResponseWriter, isTextFormat bool) *grpcWebResponse {
	g := &grpcWebResponse{
		headers:     make(http.Header),
		wrapped:     resp,
		contentType: grpcWebContentType,
	}
	if isTextFormat {
		g.wrapped = newBase64ResponseWriter(g.wrapped)
		g.contentType = grpcWebTextContentType
	}
	return g
}

func (w *grpcWebResponse) Header() http.Header {
	return w.headers
}

func (w *grpcWebResponse) Write(b []byte) (int, error) {
	w.wroteBody = true
	return w.wrapped.Write(b)
}

func (w *grpcWebResponse) WriteHeader(code int) {
	w.copyJustHeadersToWrapped()
	w.writeCorsExposedHeaders()
	w.wrapped.WriteHeader(code)
	w.wroteHeaders = true
}

func (w *grpcWebResponse) Flush() {
	if w.wroteHeaders || w.wroteBody {
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
		// Convert the content-type to the appropriate kind
		if strings.ToLower(k) == "content-type" {
			vv[0] = strings.Replace(vv[0], grpcContentType, w.contentType, 1)
		}
		for _, v := range vv {
			wrappedHeader.Add(k, v)
		}
	}
}

func (w *grpcWebResponse) finishRequest(req *http.Request) {
	if w.wroteHeaders || w.wroteBody {
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
	for h := range w.wrapped.Header() {
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

func (w *grpcWebResponse) extractTrailerHeaders() trailer {
	flushedHeaders := w.wrapped.Header()
	trailerHeaders := trailer{make(http.Header)}
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

// An http.ResponseWriter wrapper that writes base64-encoded payloads. You must call Flush()
// on this writer to ensure the base64-encoder flushes its last state.
type base64ResponseWriter struct {
	wrapped http.ResponseWriter
	encoder io.WriteCloser
}

func newBase64ResponseWriter(wrapped http.ResponseWriter) http.ResponseWriter {
	w := &base64ResponseWriter{wrapped: wrapped}
	w.newEncoder()
	return w
}

func (w *base64ResponseWriter) newEncoder() {
	w.encoder = base64.NewEncoder(base64.StdEncoding, w.wrapped)
}

func (w *base64ResponseWriter) Header() http.Header {
	return w.wrapped.Header()
}

func (w *base64ResponseWriter) Write(b []byte) (int, error) {
	return w.encoder.Write(b)
}

func (w *base64ResponseWriter) WriteHeader(code int) {
	w.wrapped.WriteHeader(code)
}

func (w *base64ResponseWriter) Flush() {
	// Flush the base64 encoder by closing it. Grpc-web permits multiple padded base64 parts:
	// https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md
	err := w.encoder.Close()
	if err != nil {
		// Must ignore this error since Flush() is not defined as returning an error
		grpclog.Errorf("ignoring error Flushing base64 encoder: %v", err)
	}
	w.newEncoder()
	w.wrapped.(http.Flusher).Flush()
}

func (w *base64ResponseWriter) CloseNotify() <-chan bool {
	return w.wrapped.(http.CloseNotifier).CloseNotify()
}
