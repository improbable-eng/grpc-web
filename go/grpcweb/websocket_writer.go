package grpcweb

import (
	"bytes"
	"encoding/binary"
	"net/http"
	"strings"

	"github.com/gorilla/websocket"
	"golang.org/x/net/http2"
)

// webSocketResponseWriter acts as a http.ResponseWriter.  It accepts bytes
// written to the response and propagates them to the websocket.  If ping is
// enabled, this also sends pings according to the timoutOutInterval when.
type webSocketResponseWriter struct {
	writtenHeaders bool
	wsConn         *websocket.Conn
	headers        http.Header
	flushedHeaders http.Header
	client         *websocketClient
}

func newWebSocketResponseWriter(wsConn *websocket.Conn, client *websocketClient) *webSocketResponseWriter {
	return &webSocketResponseWriter{
		writtenHeaders: false,
		headers:        make(http.Header),
		flushedHeaders: make(http.Header),
		wsConn:         wsConn,
		client:         client,
	}
}

// Header implements part of the https://golang.org/pkg/net/http/#ResponseWriter
// interface.
func (w *webSocketResponseWriter) Header() http.Header {
	return w.headers
}

// Write implements part of the https://golang.org/pkg/net/http/#ResponseWriter
// interface.
func (w *webSocketResponseWriter) Write(b []byte) (int, error) {
	if !w.writtenHeaders {
		w.WriteHeader(http.StatusOK)
	}
	return len(b), w.writeMessage(b)
}

// WriteHeader implements part of the https://golang.org/pkg/net/http/#ResponseWriter
// interface.
func (w *webSocketResponseWriter) WriteHeader(code int) {
	w.copyFlushedHeaders()
	w.writtenHeaders = true
	w.writeHeaderFrame(w.headers)
	return
}

func (w *webSocketResponseWriter) writeHeaderFrame(headers http.Header) {
	headerBuffer := new(bytes.Buffer)
	headers.Write(headerBuffer)
	headerGrpcDataHeader := []byte{1 << 7, 0, 0, 0, 0} // MSB=1 indicates this is a header data frame.
	binary.BigEndian.PutUint32(headerGrpcDataHeader[1:5], uint32(headerBuffer.Len()))
	w.writeMessage(headerGrpcDataHeader)
	w.writeMessage(headerBuffer.Bytes())
}

func (w *webSocketResponseWriter) copyFlushedHeaders() {
	copyHeader(
		w.flushedHeaders, w.headers,
		skipKeys("trailer"),
		keyCase(http.CanonicalHeaderKey),
	)
}

func (w *webSocketResponseWriter) extractTrailerHeaders() http.Header {
	th := make(http.Header)
	copyHeader(
		th, w.headers,
		skipKeys(append([]string{"trailer"}, headerKeys(w.flushedHeaders)...)...),
		replaceInKeys(http2.TrailerPrefix, ""),
		// gRPC-Web spec says that must use lower-case header/trailer names.
		// See "HTTP wire protocols" section in
		// https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md#protocol-differences-vs-grpc-over-http2
		keyCase(strings.ToLower),
	)
	return th
}

func (w *webSocketResponseWriter) writeMessage(b []byte) error {
	w.client.send <- b
	return nil // TODO(pcj): is there a need to propagate write errors?
}

func (w *webSocketResponseWriter) flushTrailers() {
	w.writeHeaderFrame(w.extractTrailerHeaders())
}

// Flush implements the https://golang.org/pkg/net/http/#Flusher interface.
func (w *webSocketResponseWriter) Flush() {
	// no-op
}
