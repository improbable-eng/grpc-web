package grpcweb

import (
	"bufio"
	"bytes"
	"encoding/binary"
	"errors"
	"io"
	"net/http"
	"net/textproto"
	"strings"

	"github.com/gorilla/websocket"
	"golang.org/x/net/http2"
)

type WebSocketWrapper struct {
	wsConn *websocket.Conn
}

type WebSocketResponseWriter struct {
	writtenHeaders  bool
	wsConn          *websocket.Conn
	headers         http.Header
	flushedHeaders  http.Header
	closeNotifyChan chan bool
}

func newWebSocketResponseWriter(wsConn *websocket.Conn) *WebSocketResponseWriter {
	return &WebSocketResponseWriter{
		writtenHeaders:  false,
		headers:         make(http.Header),
		flushedHeaders:  make(http.Header),
		wsConn:          wsConn,
		closeNotifyChan: make(chan bool),
	}
}

func (w *WebSocketResponseWriter) Header() http.Header {
	return w.headers
}

func (w *WebSocketResponseWriter) Write(b []byte) (int, error) {
	if !w.writtenHeaders {
		w.WriteHeader(http.StatusOK)
	}
	return len(b), w.wsConn.WriteMessage(websocket.BinaryMessage, b)
}

func (w *WebSocketResponseWriter) writeHeaderFrame(headers http.Header) {
	headerBuffer := new(bytes.Buffer)
	headers.Write(headerBuffer)
	headerGrpcDataHeader := []byte{1 << 7, 0, 0, 0, 0} // MSB=1 indicates this is a header data frame.
	binary.BigEndian.PutUint32(headerGrpcDataHeader[1:5], uint32(headerBuffer.Len()))
	w.wsConn.WriteMessage(websocket.BinaryMessage, headerGrpcDataHeader)
	w.wsConn.WriteMessage(websocket.BinaryMessage, headerBuffer.Bytes())
}

func (w *WebSocketResponseWriter) copyFlushedHeaders() {
	for k, vv := range w.headers {
		// Skip the pre-annoucement of Trailer headers. Don't add them to the response headers.
		if strings.ToLower(k) == "trailer" {
			continue
		}
		for _, v := range vv {
			w.flushedHeaders.Add(k, v)
		}
	}
}

func (w *WebSocketResponseWriter) WriteHeader(code int) {
	w.copyFlushedHeaders()
	w.writtenHeaders = true
	w.writeHeaderFrame(w.headers)
	return
}

func (w *WebSocketResponseWriter) extractTrailerHeaders() http.Header {
	trailerHeaders := make(http.Header)
	for k, vv := range w.headers {
		// Skip the pre-annoucement of Trailer headers. Don't add them to the response headers.
		if strings.ToLower(k) == "trailer" {
			continue
		}
		// Skip existing headers that were already sent.
		if _, exists := w.flushedHeaders[k]; exists {
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

func (w *WebSocketResponseWriter) FlushTrailers() {
	w.writeHeaderFrame(w.extractTrailerHeaders())
}

func (w *WebSocketResponseWriter) Flush() {
	// no-op
}

func (w *WebSocketResponseWriter) CloseNotify() <-chan bool {
	return w.closeNotifyChan
}

type WebSocketWrappedReader struct {
	wsConn          *websocket.Conn
	respWriter      *WebSocketResponseWriter
	remainingBuffer []byte
	remainingError  error
}

func (w *WebSocketWrappedReader) Close() error {
	w.respWriter.FlushTrailers()
	return w.wsConn.Close()
}

// First byte of a binary WebSocket frame is used for control flow:
// 0 = Data
// 1 = End of client send
func (w *WebSocketWrappedReader) Read(p []byte) (int, error) {
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
		w.respWriter.closeNotifyChan <- true
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

func NewWebsocketWrappedReader(wsConn *websocket.Conn, respWriter *WebSocketResponseWriter) *WebSocketWrappedReader {
	return &WebSocketWrappedReader{
		wsConn:          wsConn,
		respWriter:      respWriter,
		remainingBuffer: nil,
		remainingError:  nil,
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
