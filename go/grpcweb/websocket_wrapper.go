package grpcweb

import (
	"bufio"
	"bytes"
	"context"
	"encoding/binary"
	"errors"
	"io"
	"net/http"
	"net/textproto"
	"strings"

	"github.com/gorilla/websocket"
	"golang.org/x/net/http2"
)

type webSocketResponseWriter struct {
	writtenHeaders  bool
	wsConn          *websocket.Conn
	headers         http.Header
	flushedHeaders  http.Header
	closeNotifyChan chan bool
}

func newWebSocketResponseWriter(wsConn *websocket.Conn) *webSocketResponseWriter {
	return &webSocketResponseWriter{
		writtenHeaders:  false,
		headers:         make(http.Header),
		flushedHeaders:  make(http.Header),
		wsConn:          wsConn,
		closeNotifyChan: make(chan bool, 1),
	}
}

func (w *webSocketResponseWriter) Header() http.Header {
	return w.headers
}

func (w *webSocketResponseWriter) Write(b []byte) (int, error) {
	if !w.writtenHeaders {
		w.WriteHeader(http.StatusOK)
	}
	return len(b), w.wsConn.WriteMessage(websocket.BinaryMessage, b)
}

func (w *webSocketResponseWriter) writeHeaderFrame(headers http.Header) {
	headerBuffer := new(bytes.Buffer)
	headers.Write(headerBuffer)
	headerGrpcDataHeader := []byte{1 << 7, 0, 0, 0, 0} // MSB=1 indicates this is a header data frame.
	binary.BigEndian.PutUint32(headerGrpcDataHeader[1:5], uint32(headerBuffer.Len()))
	w.wsConn.WriteMessage(websocket.BinaryMessage, headerGrpcDataHeader)
	w.wsConn.WriteMessage(websocket.BinaryMessage, headerBuffer.Bytes())
}

func (w *webSocketResponseWriter) copyFlushedHeaders() {
	copyHeader(
		w.flushedHeaders, w.headers,
		skipKeys("trailer"),
		keyCase(http.CanonicalHeaderKey),
	)
}

func (w *webSocketResponseWriter) WriteHeader(code int) {
	w.copyFlushedHeaders()
	w.writtenHeaders = true
	w.writeHeaderFrame(w.headers)
	return
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

func (w *webSocketResponseWriter) FlushTrailers() {
	w.writeHeaderFrame(w.extractTrailerHeaders())
}

func (w *webSocketResponseWriter) Flush() {
	// no-op
}

func (w *webSocketResponseWriter) CloseNotify() <-chan bool {
	return w.closeNotifyChan
}

type webSocketWrappedReader struct {
	wsConn          *websocket.Conn
	respWriter      *webSocketResponseWriter
	remainingBuffer []byte
	remainingError  error
	cancel          context.CancelFunc
}

func (w *webSocketWrappedReader) Close() error {
	w.respWriter.FlushTrailers()
	return w.wsConn.Close()
}

// First byte of a binary WebSocket frame is used for control flow:
// 0 = Data
// 1 = End of client send
func (w *webSocketWrappedReader) Read(p []byte) (int, error) {
	// If a buffer remains from a previous WebSocket frame read then continue reading it
	if w.remainingBuffer != nil {

		// If the remaining buffer fits completely inside the argument slice then read all of it and return any error
		// that was retained from the original call
		if len(w.remainingBuffer) <= len(p) {
			copy(p, w.remainingBuffer)

			remainingLength := len(w.remainingBuffer)
			err := w.remainingError

			// Clear the remaining buffer and error so that the next read will be a read from the websocket frame,
			// unless the error terminates the stream
			w.remainingBuffer = nil
			w.remainingError = nil
			return remainingLength, err
		}

		// The remaining buffer doesn't fit inside the argument slice, so copy the bytes that will fit and retain the
		// bytes that don't fit - don't return the remainingError as there are still bytes to be read from the frame
		copy(p, w.remainingBuffer[:len(p)])
		w.remainingBuffer = w.remainingBuffer[len(p):]

		// Return the length of the argument slice as that was the length of the written bytes
		return len(p), nil
	}

	// Read a whole frame from the WebSocket connection
	messageType, framePayload, err := w.wsConn.ReadMessage()
	if err == io.EOF || messageType == -1 {
		// The client has closed the connection. Indicate to the response writer that it should close
		w.cancel()
		return 0, io.EOF
	}

	// Only Binary frames are valid
	if messageType != websocket.BinaryMessage {
		return 0, errors.New("websocket frame was not a binary frame")
	}

	// If the frame consists of only a single byte of value 1 then this indicates the client has finished sending
	if len(framePayload) == 1 && framePayload[0] == 1 {
		return 0, io.EOF
	}

	// If the frame is somehow empty then just return the error
	if len(framePayload) == 0 {
		return 0, err
	}

	// The first byte is used for control flow, so the data starts from the second byte
	dataPayload := framePayload[1:]

	// If the remaining buffer fits completely inside the argument slice then read all of it and return the error
	if len(dataPayload) <= len(p) {
		copy(p, dataPayload)
		return len(dataPayload), err
	}

	// The data read from the frame doesn't fit inside the argument slice, so copy the bytes that fit into the argument
	// slice
	copy(p, dataPayload[:len(p)])

	// Retain the bytes that do not fit in the argument slice
	w.remainingBuffer = dataPayload[len(p):]
	// Retain the error instead of returning it so that the retained bytes will be read
	w.remainingError = err

	// Return the length of the argument slice as that is the length of the written bytes
	return len(p), nil
}

func newWebsocketWrappedReader(wsConn *websocket.Conn, respWriter *webSocketResponseWriter, cancel context.CancelFunc) *webSocketWrappedReader {
	return &webSocketWrappedReader{
		wsConn:          wsConn,
		respWriter:      respWriter,
		remainingBuffer: nil,
		remainingError:  nil,
		cancel:          cancel,
	}
}

func parseHeaders(headerString string) (http.Header, error) {
	reader := bufio.NewReader(strings.NewReader(headerString + "\r\n"))
	tp := textproto.NewReader(reader)

	mimeHeader, err := tp.ReadMIMEHeader()
	if err != nil {
		return nil, err
	}

	// http.Header and textproto.MIMEHeader are both just a map[string][]string
	return http.Header(mimeHeader), nil
}
