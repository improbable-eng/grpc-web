//Copyright 2017 Improbable. All Rights Reserved.
// See LICENSE for licensing terms.

package grpcweb

import (
	"net/http"
	"net/url"

	"strings"
	"time"

	"github.com/gorilla/websocket"
	"github.com/rs/cors"
	"google.golang.org/grpc"
	"google.golang.org/grpc/grpclog"
)

var (
	internalRequestHeadersWhitelist = []string{
		"U-A", // for gRPC-Web User Agent indicator.
	}
)

type WrappedGrpcServer struct {
	server              *grpc.Server
	opts                *options
	corsWrapper         *cors.Cors
	originFunc          func(origin string) bool
	enableWebsockets    bool
	websocketOriginFunc func(req *http.Request) bool
}

// WrapServer takes a gRPC Server in Go and returns a WrappedGrpcServer that provides gRPC-Web Compatibility.
//
// The internal implementation fakes out a http.Request that carries standard gRPC, and performs the remapping inside
// http.ResponseWriter, i.e. mostly the re-encoding of Trailers (that carry gRPC status).
//
// You can control the behaviour of the wrapper (e.g. modifying CORS behaviour) using `With*` options.
func WrapServer(server *grpc.Server, options ...Option) *WrappedGrpcServer {
	opts := evaluateOptions(options)
	corsWrapper := cors.New(cors.Options{
		AllowOriginFunc:  opts.originFunc,
		AllowedHeaders:   append(opts.allowedRequestHeaders, internalRequestHeadersWhitelist...),
		ExposedHeaders:   nil,                                 // make sure that this is *nil*, otherwise the WebResponse overwrite will not work.
		AllowCredentials: true,                                // always allow credentials, otherwise :authorization headers won't work
		MaxAge:           int(10 * time.Minute / time.Second), // make sure pre-flights don't happen too often (every 5s for Chromium :( )
	})
	websocketOriginFunc := opts.websocketOriginFunc
	if websocketOriginFunc == nil {
		websocketOriginFunc = func(req *http.Request) bool {
			origin := req.Header.Get("Origin")
			parsedUrl, err := url.ParseRequestURI(origin)
			if err != nil {
				grpclog.Warningf("Unable to parse url for grpc-websocket origin check: %s. error: %v", origin, err)
				return false
			}
			return parsedUrl.Host == req.Host
		}
	}
	return &WrappedGrpcServer{
		server:              server,
		opts:                opts,
		corsWrapper:         corsWrapper,
		originFunc:          opts.originFunc,
		enableWebsockets:    opts.enableWebsockets,
		websocketOriginFunc: websocketOriginFunc,
	}
}

// ServeHTTP takes a HTTP request and if it is a gRPC-Web request wraps it with a compatibility layer to transform it to
// a standard gRPC request for the wrapped gRPC server and transforms the response to comply with the gRPC-Web protocol.
//
// The gRPC-Web compatibility is only invoked if the request is a gRPC-Web request as determined by IsGrpcWebRequest or
// the request is a pre-flight (CORS) request as determined by IsAcceptableGrpcCorsRequest.
//
// You can control the CORS behaviour using `With*` options in the WrapServer function.
func (w *WrappedGrpcServer) ServeHTTP(resp http.ResponseWriter, req *http.Request) {
	if w.enableWebsockets && w.IsGrpcWebSocketRequest(req) {
		if w.websocketOriginFunc(req) {
			if !w.opts.corsForRegisteredEndpointsOnly || w.isRequestForRegisteredEndpoint(req) {
				w.HandleGrpcWebsocketRequest(resp, req)
				return
			}
		}
		resp.WriteHeader(403)
		resp.Write(make([]byte, 0))
		return
	}

	if w.IsAcceptableGrpcCorsRequest(req) || w.IsGrpcWebRequest(req) {
		w.corsWrapper.Handler(http.HandlerFunc(w.HandleGrpcWebRequest)).ServeHTTP(resp, req)
		return
	}
	w.server.ServeHTTP(resp, req)
}

func (w *WrappedGrpcServer) IsGrpcWebSocketRequest(req *http.Request) bool {
	return req.Header.Get("Upgrade") == "websocket" && req.Header.Get("Sec-Websocket-Protocol") == "grpc-websockets"
}

// HandleGrpcWebRequest takes a HTTP request that is assumed to be a gRPC-Web request and wraps it with a compatibility
// layer to transform it to a standard gRPC request for the wrapped gRPC server and transforms the response to comply
// with the gRPC-Web protocol.
func (w *WrappedGrpcServer) HandleGrpcWebRequest(resp http.ResponseWriter, req *http.Request) {
	intReq := hackIntoNormalGrpcRequest(req)
	intResp := newGrpcWebResponse(resp)
	w.server.ServeHTTP(intResp, intReq)
	intResp.finishRequest(req)
}

var websocketUpgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
	Subprotocols:    []string{"grpc-websockets"},
}

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

	respWriter := newWebSocketResponseWriter(wsConn)
	wrappedReader := NewWebsocketWrappedReader(wsConn, respWriter)

	req.Body = wrappedReader
	req.Method = http.MethodPost
	req.Header = headers
	req.ProtoMajor = 2
	req.ProtoMinor = 0
	contentType := req.Header.Get("content-type")
	req.Header.Set("content-type", strings.Replace(contentType, "application/grpc-web", "application/grpc", 1))

	w.server.ServeHTTP(respWriter, req)
}

// IsGrpcWebRequest determines if a request is a gRPC-Web request by checking that the "content-type" is
// "application/grpc-web" and that the method is POST.
func (w *WrappedGrpcServer) IsGrpcWebRequest(req *http.Request) bool {
	return req.Method == http.MethodPost && strings.HasPrefix(req.Header.Get("content-type"), "application/grpc-web")
}

// IsAcceptableGrpcCorsRequest determines if a request is a CORS pre-flight request for a gRPC-Web request and that this
// request is acceptable for CORS.
//
// You can control the CORS behaviour using `With*` options in the WrapServer function.
func (w *WrappedGrpcServer) IsAcceptableGrpcCorsRequest(req *http.Request) bool {
	accessControlHeaders := strings.ToLower(req.Header.Get("Access-Control-Request-Headers"))
	if req.Method == http.MethodOptions && strings.Contains(accessControlHeaders, "x-grpc-web") {
		if w.opts.corsForRegisteredEndpointsOnly {
			return w.isRequestForRegisteredEndpoint(req)
		}
		return true
	}
	return false
}

func (w *WrappedGrpcServer) isRequestForRegisteredEndpoint(req *http.Request) bool {
	registeredEndpoints := ListGRPCResources(w.server)
	requestedEndpoint := req.URL.Path
	for _, v := range registeredEndpoints {
		if v == requestedEndpoint {
			return true
		}
	}
	return false
}

func hackIntoNormalGrpcRequest(req *http.Request) *http.Request {
	// Hack, this should be a shallow copy, but let's see if this works
	req.ProtoMajor = 2
	req.ProtoMinor = 0
	contentType := req.Header.Get("content-type")
	req.Header.Set("content-type", strings.Replace(contentType, "application/grpc-web", "application/grpc", 1))
	return req
}
