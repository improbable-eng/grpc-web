//Copyright 2017 Improbable. All Rights Reserved.
// See LICENSE for licensing terms.

package grpcweb

import (
	"context"
	"encoding/base64"
	"io"
	"net/http"
	"strings"

	"github.com/gorilla/websocket"
	"google.golang.org/grpc"
	"google.golang.org/grpc/grpclog"
)

// https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md#protocol-differences-vs-grpc-over-http2
const grpcContentType = "application/grpc"
const grpcWebContentType = "application/grpc-web"
const grpcWebTextContentType = "application/grpc-web-text"

type WrappedGrpcServer struct {
	server *grpc.Server
	opts   *options
}

// WrapServer takes a gRPC Server in Go and returns a WrappedGrpcServer that provides gRPC-Web Compatibility.
//
// The internal implementation fakes out a http.Request that carries standard gRPC, and performs the remapping inside
// http.ResponseWriter, i.e. mostly the re-encoding of Trailers (that carry gRPC status).
func WrapServer(server *grpc.Server, options ...Option) *WrappedGrpcServer {
	opts := evaluateOptions(options)
	return &WrappedGrpcServer{
		server: server,
		opts:   opts,
	}
}

// ServeHTTP takes a HTTP request and if it is a gRPC-Web request wraps it with a compatibility layer to transform it to
// a standard gRPC request for the wrapped gRPC server and transforms the response to comply with the gRPC-Web protocol.
func (w *WrappedGrpcServer) ServeHTTP(resp http.ResponseWriter, req *http.Request) {
	if w.opts.enableWebsockets && w.IsGrpcWebSocketRequest(req) {
		w.HandleGrpcWebsocketRequest(resp, req)
	} else if w.IsGrpcWebRequest(req) {
		w.HandleGrpcWebRequest(resp, req)
	} else {
		w.server.ServeHTTP(resp, req)
	}
}

// IsGrpcWebSocketRequest determines if a request is a gRPC-Web request by checking that the "Sec-Websocket-Protocol"
// header value is "grpc-websockets"
func (w *WrappedGrpcServer) IsGrpcWebSocketRequest(req *http.Request) bool {
	return req.Header.Get("Upgrade") == "websocket" && req.Header.Get("Sec-Websocket-Protocol") == "grpc-websockets"
}

// HandleGrpcWebRequest takes a HTTP request that is assumed to be a gRPC-Web request and wraps it with a compatibility
// layer to transform it to a standard gRPC request for the wrapped gRPC server and transforms the response to comply
// with the gRPC-Web protocol.
func (w *WrappedGrpcServer) HandleGrpcWebRequest(resp http.ResponseWriter, req *http.Request) {
	intReq, isTextFormat := hackIntoNormalGrpcRequest(req)
	intResp := newGrpcWebResponse(resp, isTextFormat)
	w.server.ServeHTTP(intResp, intReq)
	intResp.finishRequest(req)
}

var websocketUpgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
	Subprotocols:    []string{"grpc-websockets"},
}

// HandleGrpcWebsocketRequest takes a HTTP request that is assumed to be a gRPC-Websocket request and wraps it with a
// compatibility layer to transform it to a standard gRPC request for the wrapped gRPC server and transforms the
// response to comply with the gRPC-Web protocol.
func (w *WrappedGrpcServer) HandleGrpcWebsocketRequest(resp http.ResponseWriter, req *http.Request) {
	conn, err := websocketUpgrader.Upgrade(resp, req, nil)
	if err != nil {
		grpclog.Errorf("Unable to upgrade websocket request: %v", err)
		return
	}
	w.handleWebSocket(conn, req)
}

func (w *WrappedGrpcServer) handleWebSocket(wsConn *websocket.Conn, req *http.Request) {
	messageType, readBytes, err := wsConn.ReadMessage()
	if err != nil {
		grpclog.Errorf("Unable to read first websocket message: %v", err)
		return
	}

	if messageType != websocket.BinaryMessage {
		grpclog.Errorf("First websocket message is non-binary")
		return
	}

	headers, err := parseHeaders(string(readBytes))
	if err != nil {
		grpclog.Errorf("Unable to parse websocket headers: %v", err)
		return
	}

	ctx, cancelFunc := context.WithCancel(req.Context())
	defer cancelFunc()

	respWriter := newWebSocketResponseWriter(wsConn)
	wrappedReader := newWebsocketWrappedReader(wsConn, respWriter, cancelFunc)

	req.Body = wrappedReader
	req.Method = http.MethodPost
	req.Header = headers

	interceptedRequest, isTextFormat := hackIntoNormalGrpcRequest(req.WithContext(ctx))
	if isTextFormat {
		grpclog.Errorf("web socket text format requests not yet supported")
		return
	}
	w.server.ServeHTTP(respWriter, interceptedRequest)
}

// IsGrpcWebRequest determines if a request is a gRPC-Web request by checking that the "content-type" is
// "application/grpc-web" and that the method is POST.
func (w *WrappedGrpcServer) IsGrpcWebRequest(req *http.Request) bool {
	return req.Method == http.MethodPost && strings.HasPrefix(req.Header.Get("content-type"), grpcWebContentType)
}

// readerCloser combines an io.Reader and an io.Closer into an io.ReadCloser.
type readerCloser struct {
	reader io.Reader
	closer io.Closer
}

func (r *readerCloser) Read(dest []byte) (int, error) {
	return r.reader.Read(dest)
}
func (r *readerCloser) Close() error {
	return r.closer.Close()
}

func hackIntoNormalGrpcRequest(req *http.Request) (*http.Request, bool) {
	// Hack, this should be a shallow copy, but let's see if this works
	req.ProtoMajor = 2
	req.ProtoMinor = 0

	contentType := req.Header.Get("content-type")
	incomingContentType := grpcWebContentType
	isTextFormat := strings.HasPrefix(contentType, grpcWebTextContentType)
	if isTextFormat {
		// body is base64-encoded: decode it; Wrap it in readerCloser so Body is still closed
		decoder := base64.NewDecoder(base64.StdEncoding, req.Body)
		req.Body = &readerCloser{reader: decoder, closer: req.Body}
		incomingContentType = grpcWebTextContentType
	}
	req.Header.Set("content-type", strings.Replace(contentType, incomingContentType, grpcContentType, 1))

	// Remove content-length header since it represents http1.1 payload size, not the sum of the h2
	// DATA frame payload lengths. https://http2.github.io/http2-spec/#malformed This effectively
	// switches to chunked encoding which is the default for h2
	req.Header.Del("content-length")

	return req, isTextFormat
}
