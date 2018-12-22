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
	wrapped      http.ResponseWriter

	// Data in the body of the response must be written with writer
	writer io.Writer
	// If not nil, must be closed at the end of the response
	closer io.Closer
	// The output content type: will replace the base application/grpc with this
	contentType string
}

func newGrpcWebResponse(resp http.ResponseWriter, isTextFormat bool) *grpcWebResponse {
	g := &grpcWebResponse{headers: make(http.Header), wrapped: resp}
	g.writer = resp
	g.contentType = grpcWebContentType
	if isTextFormat {
		w := encodeBase64Writer(resp)
		g.writer = w
		g.closer = w
		g.contentType = grpcWebTextContentType
	}
	return g
}

// Returns a writer that will write base64 encoded bytes to w.
// This starts a goroutine to avoid excessive buffering.
func encodeBase64Writer(w io.Writer) io.WriteCloser {
	pipeReader, pipeWriter := io.Pipe()
	encoder := base64.NewEncoder(base64.StdEncoding, w)

	go func() {
		// read from the pipe and copy it to the encoder which writes to w; always close the original writer
		_, err := io.Copy(encoder, pipeReader)
		encoderCloseErr := encoder.Close()
		if err != nil {
			// error occurred: return it on the reader side
			pipeWriter.CloseWithError(err)
		}
		if encoderCloseErr != nil {
			pipeWriter.CloseWithError(encoderCloseErr)
		}

		// close the pipe
		err = pipeReader.Close()
		if err != nil {
			pipeWriter.CloseWithError(err)
		}
	}()

	return pipeWriter
}

func (w *grpcWebResponse) Header() http.Header {
	return w.headers
}

func (w *grpcWebResponse) Write(b []byte) (int, error) {
	w.wroteBody = true
	return w.writer.Write(b)
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
	if w.closer != nil {
		err := w.closer.Close()
		if err != nil {
			grpclog.Errorf("grpcWebResponse: Unexpected error finishing request: %v", err)
		}
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
	w.writer.Write(trailerGrpcDataHeader)
	w.writer.Write(trailerBuffer.Bytes())
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
