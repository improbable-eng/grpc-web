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
	"time"

	"github.com/desertbit/timer"
	"github.com/gorilla/websocket"
	"golang.org/x/net/http2"
	"google.golang.org/grpc/grpclog"
)

type WebSocketWrapped struct {
	*WrappedGrpcServer
}

var websocketUpgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
	Subprotocols:    []string{"grpc-websockets"},
}

// IsGrpcWebSocketRequest determines if a request is a gRPC-Websocket request by checking that the "Sec-Websocket-Protocol"
// header value is "grpc-websockets"
func (w *WebSocketWrapped) IsGrpcWebSocketRequest(req *http.Request) bool {
	return req.Header.Get("Upgrade") == "websocket" && req.Header.Get("Sec-Websocket-Protocol") == "grpc-websockets"
}

// HandleGrpcWebsocketRequest takes a HTTP request that is assumed to be a gRPC-Websocket request and wraps it with a
// compatibility layer to transform it to a standard gRPC request for the wrapped gRPC server and transforms the
// response to comply with the gRPC-Web protocol.
func (w *WebSocketWrapped) HandleGrpcWebsocketRequest(resp http.ResponseWriter, req *http.Request) {
	wsConn, err := websocketUpgrader.Upgrade(resp, req, nil)
	if err != nil {
		grpclog.Errorf("Unable to upgrade websocket request: %v", err)
		return
	}
	headers := make(http.Header)
	for _, name := range w.allowedHeaders {
		if values, exist := req.Header[name]; exist {
			headers[name] = values
		}
	}

	messageType, readBytes, err := wsConn.ReadMessage()
	if err != nil {
		grpclog.Errorf("Unable to read first websocket message: %v", err)
		return
	}

	if messageType != websocket.BinaryMessage {
		grpclog.Errorf("First websocket message is non-binary")
		return
	}

	wsHeaders, err := parseHeaders(string(readBytes))
	if err != nil {
		grpclog.Errorf("Unable to parse websocket headers: %v", err)
		return
	}

	ctx, cancelFunc := context.WithCancel(req.Context())
	defer cancelFunc()

	respWriter := newWebSocketResponseWriter(wsConn)
	if w.opts.websocketPingInterval >= time.Second {
		respWriter.enablePing(w.opts.websocketPingInterval)
	}
	wrappedReader := newWebsocketWrappedReader(wsConn, respWriter, cancelFunc)

	for name, values := range wsHeaders {
		headers[name] = values
	}
	req.Body = wrappedReader
	req.Method = http.MethodPost
	req.Header = headers

	interceptedRequest, isTextFormat := hackIntoNormalGrpcRequest(req.WithContext(ctx))
	if isTextFormat {
		grpclog.Errorf("web socket text format requests not yet supported")
	}
	req.URL.Path = w.endpointFunc(req)
	w.handler.ServeHTTP(respWriter, interceptedRequest)
}

func (w *WebSocketWrapped) serveHTTP(resp http.ResponseWriter, req *http.Request) {
	if w.websocketOriginFunc(req) {
		if !w.opts.corsForRegisteredEndpointsOnly || w.isRequestForRegisteredEndpoint(req) {
			w.HandleGrpcWebsocketRequest(resp, req)
			return
		}
	}
	resp.WriteHeader(403)
	_, _ = resp.Write(make([]byte, 0))
}

// ServeHTTP takes a HTTP request and if it is a gRPC-Websocket request wraps it with compatibility layer to transform
// it to a standard gRPC request for the wrapped gRPC server and transforms the response to comply with the gRPC-Web protocol.
func (w *WebSocketWrapped) ServeHTTP(resp http.ResponseWriter, req *http.Request) {
	if w.IsGrpcWebSocketRequest(req) {
		w.serveHTTP(resp, req)
	}
	w.handler.ServeHTTP(resp, req)
}

type webSocketResponseWriter struct {
	writtenHeaders  bool
	wsConn          *websocket.Conn
	headers         http.Header
	flushedHeaders  http.Header
	timeOutInterval time.Duration
	timer           *timer.Timer
}

func newWebSocketResponseWriter(wsConn *websocket.Conn) *webSocketResponseWriter {
	return &webSocketResponseWriter{
		writtenHeaders: false,
		headers:        make(http.Header),
		flushedHeaders: make(http.Header),
		wsConn:         wsConn,
	}
}

func (w *webSocketResponseWriter) enablePing(timeOutInterval time.Duration) {
	w.timeOutInterval = timeOutInterval
	w.timer = timer.NewTimer(w.timeOutInterval)
	dispose := make(chan bool)
	w.wsConn.SetCloseHandler(func(code int, text string) error {
		close(dispose)
		return nil
	})
	go w.ping(dispose)
}

func (w *webSocketResponseWriter) ping(dispose chan bool) {
	if dispose == nil {
		return
	}
	defer w.timer.Stop()
	for {
		select {
		case <-dispose:
			return
		case <-w.timer.C:
			w.timer.Reset(w.timeOutInterval)
			w.wsConn.WriteMessage(websocket.PingMessage, []byte{})
		}
	}
}

func (w *webSocketResponseWriter) Header() http.Header {
	return w.headers
}

func (w *webSocketResponseWriter) Write(b []byte) (int, error) {
	if !w.writtenHeaders {
		w.WriteHeader(http.StatusOK)
	}
	if w.timeOutInterval > time.Second && w.timer != nil {
		w.timer.Reset(w.timeOutInterval)
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
