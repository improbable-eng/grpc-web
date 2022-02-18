package main

import (
	"context"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"time"

	"github.com/desertbit/timer"
	grpc_middleware "github.com/grpc-ecosystem/go-grpc-middleware"
	grpc_logrus "github.com/grpc-ecosystem/go-grpc-middleware/logging/logrus"
	grpc_prometheus "github.com/grpc-ecosystem/go-grpc-prometheus"
	"github.com/mwitkow/grpc-proxy/proxy"
	"github.com/sirupsen/logrus"
	"github.com/spf13/pflag"
	grpc "google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
	"google.golang.org/protobuf/proto"
	"nhooyr.io/websocket"
)

var (
	flagMaxCallRecvMsgSize = pflag.Int(
		"backend_max_call_recv_msg_size",
		1024*1024*4, // The current maximum receive msg size per https://github.com/grpc/grpc-go/blob/v1.8.2/server.go#L54
		"Maximum receive message size limit. If not specified, the default of 4MB will be used.",
	)
)

// EchoServer is the WebSocket echo server implementation.
// It ensures the client speaks the echo subprotocol and
// only allows one message every 100ms with a 10 message burst.
type EchoServer struct {
	logf   *logrus.Entry
	client http.Handler
}

func buildGrpcProxyServer(backendConn *grpc.ClientConn, logger *logrus.Entry) *grpc.Server {
	// gRPC-wide changes.
	grpc.EnableTracing = true
	grpc_logrus.ReplaceGrpcLogger(logger)

	// gRPC proxy logic.
	director := func(ctx context.Context, fullMethodName string) (context.Context, *grpc.ClientConn, error) {
		md, _ := metadata.FromIncomingContext(ctx)
		outCtx, _ := context.WithCancel(ctx)
		mdCopy := md.Copy()
		delete(mdCopy, "user-agent")
		logger.Info("redirecting request")
		// If this header is present in the request from the web client,
		// the actual connection to the backend will not be established.
		// https://github.com/improbable-eng/grpc-web/issues/568
		delete(mdCopy, "connection")
		outCtx = metadata.NewOutgoingContext(outCtx, mdCopy)
		return outCtx, backendConn, nil
	}

	// Server with logging and monitoring enabled.
	return grpc.NewServer(
		grpc.CustomCodec(proxy.Codec()), // needed for proxy to function.
		grpc.UnknownServiceHandler(proxy.TransparentHandler(director)),
		grpc.MaxRecvMsgSize(*flagMaxCallRecvMsgSize),
		grpc_middleware.WithUnaryServerChain(
			grpc_logrus.UnaryServerInterceptor(logger),
			grpc_prometheus.UnaryServerInterceptor,
		),
		grpc_middleware.WithStreamServerChain(
			grpc_logrus.StreamServerInterceptor(logger),
			grpc_prometheus.StreamServerInterceptor,
		),
	)
}

func NewEchoServer(logf *logrus.Entry, backendHostPort string) (*EchoServer, error) {
	opt := []grpc.DialOption{}
	opt = append(opt, grpc.WithCodec(proxy.Codec()))
	opt = append(opt, grpc.WithInsecure())
	cc, err := grpc.Dial(backendHostPort, opt...)

	if err != nil {
		logf.Error(err)
		return nil, err
	}
	server := buildGrpcProxyServer(cc, logf)

	return &EchoServer{
		logf:   logf,
		client: server,
	}, nil
}

type WebsocketChannel struct {
	logf            *logrus.Entry
	socket          *websocket.Conn
	activeStreams   map[uint32]*GrpcStream
	timeOutInterval time.Duration
	timer           *timer.Timer
	context         context.Context
	handler         http.Handler
}

func NewWebsocketChannel(websocket *websocket.Conn, handler http.Handler, context context.Context, logf *logrus.Entry) *WebsocketChannel {
	return &WebsocketChannel{
		logf:            logf,
		socket:          websocket,
		activeStreams:   make(map[uint32]*GrpcStream),
		timeOutInterval: 10 * time.Second,
		timer:           nil,
		context:         context,
		handler:         handler,
	}
}

func (w *WebsocketChannel) enablePing(timeOutInterval time.Duration) {
	w.timeOutInterval = timeOutInterval
	w.timer = timer.NewTimer(w.timeOutInterval)
	go w.ping()
}

func (w *WebsocketChannel) ping() {
	defer w.timer.Stop()
	for {
		select {
		case <-w.context.Done():
			return
		case <-w.timer.C:
			w.timer.Reset(w.timeOutInterval)
			w.socket.Ping(w.context)
		}
	}
}

func (ws *WebsocketChannel) read() (*GrpcFrame, error) {
	//we assume a large limit is set for the websocket to avoid handling multiple frames.
	typ, r, err := ws.socket.Reader(ws.context)
	if err != nil {
		return nil, err
	}

	if typ != websocket.MessageBinary {
		return nil, errors.New("websocket channel only supports binary messages")
	}

	bytesValue, err := ioutil.ReadAll(r)
	request := &GrpcFrame{}
	if err := proto.Unmarshal(bytesValue, request); err != nil {
		return nil, fmt.Errorf("error %v", err)
	}
	return request, nil
}

func (ws *WebsocketChannel) write(frame *GrpcFrame) error {

	binaryFrame, err := proto.Marshal(frame)
	if err != nil {
		return err
	}

	return ws.socket.Write(ws.context, websocket.MessageBinary, binaryFrame)
}

func (ws *WebsocketChannel) Close() {
	//todo check and close the websocket
	for _, gs := range ws.activeStreams {
		gs.Close()
	}
}

func (ws *WebsocketChannel) poll() error {
	ws.logf.Infof("polling websocket channel")
	frame, err := ws.read()
	if err == io.EOF {
		ws.Close()
	}

	if err != nil {
		return err
	}

	stream := ws.activeStreams[frame.StreamId]

	switch op := frame.Payload; op.(type) {
	case *GrpcFrame_Header:

		if stream != nil {
			//Todo return this to the client stream
			return fmt.Errorf("stream with id alredy exists: %v", frame.StreamId)
		}
		ctx, cancel := context.WithCancel(ws.context)
		stream := &GrpcStream{
			id:              frame.StreamId,
			inputFrames:     make(chan *GrpcFrame, 2), // how many frames should we allow to buffer
			channel:         ws,
			ctx:             ctx,
			cancel:          cancel,
			responseHeaders: make(http.Header),
		}

		ws.activeStreams[frame.StreamId] = stream
		url, err := url.Parse("http://localhost:50051/" + frame.GetHeader().Operation)
		if err != nil {
			//todo send back error
			return err
		}

		req := &http.Request{
			Method: http.MethodPost,
			URL:    url,
			Header: make(map[string][]string),
			Body:   stream,
		}
		for key, element := range frame.GetHeader().Headers {
			req.Header[key] = []string{element}
		}

		//todo add handler to the websocket channel and then forward it to this.
		interceptedRequest, _ := hackIntoNormalGrpcRequest(req.WithContext(stream.ctx))
		ws.logf.Infof("starting call to http server %v", interceptedRequest)
		go ws.handler.ServeHTTP(stream, interceptedRequest)

	case *GrpcFrame_Body:
		if stream == nil {
			//todo return this as an error frame to the socket
			return fmt.Errorf("stream %v does not exist", frame.StreamId)
		} else {
			ws.logf.Infof("received body %v", frame)
			stream.inputFrames <- frame
		}

	case *GrpcFrame_Cancel:
		if stream == nil {
			delete(ws.activeStreams, frame.StreamId)
			//todo return this as an error frame to the socket
			return fmt.Errorf("stream %v does not exist", frame.StreamId)
		} else {
			stream.cancel()
		}
	case *GrpcFrame_Complete:
		if stream == nil {
			delete(ws.activeStreams, frame.StreamId)
			//todo return this as an error frame to the socket
			return fmt.Errorf("stream %v does not exist", frame.StreamId)
		} else {
			close(stream.inputFrames)
		}
	case *GrpcFrame_Error:
		if stream == nil {
			delete(ws.activeStreams, frame.StreamId)
			//todo return this as an error frame to the socket
			return fmt.Errorf("stream %v does not exist", frame.StreamId)
		} else {
			stream.inputFrames <- frame
			close(stream.inputFrames)
		}
	default:

	}
	return nil
}

const grpcContentType = "application/grpc"
const grpcWebContentType = "application/grpc-web"
const grpcWebTextContentType = "application/grpc-web-text"

func hackIntoNormalGrpcRequest(req *http.Request) (*http.Request, bool) {
	// Hack, this should be a shallow copy, but let's see if this works
	req.ProtoMajor = 2
	req.ProtoMinor = 0

	// contentType := req.Header.Get("content-type")
	// incomingContentType := grpcWebContentType
	req.Header.Set("content-type", "application/grpc+proto")
	req.Header.Set("grpc-encoding", "identity")

	// Remove content-length header since it represents http1.1 payload size, not the sum of the h2
	// DATA frame payload lengths. https://http2.github.io/http2-spec/#malformed This effectively
	// switches to chunked encoding which is the default for h2
	req.Header.Del("content-length")

	return req, false
}

type GrpcStream struct {
	id                uint32
	hasWrittenHeaders bool
	responseHeaders   http.Header
	inputFrames       chan *GrpcFrame
	channel           *WebsocketChannel
	ctx               context.Context
	cancel            context.CancelFunc
	remainingBuffer   []byte
	remainingError    error
	//todo add a context to return to close the connection
}

func (stream *GrpcStream) Flush() {}

func (stream *GrpcStream) Header() http.Header {
	return stream.responseHeaders
}

func (stream *GrpcStream) Read(p []byte) (int, error) {
	stream.channel.logf.Infof("reading from channel %v", stream.id)
	if stream.remainingBuffer != nil {

		// If the remaining buffer fits completely inside the argument slice then read all of it and return any error
		// that was retained from the original call
		if len(stream.remainingBuffer) <= len(p) {
			copy(p, stream.remainingBuffer)

			remainingLength := len(stream.remainingBuffer)
			err := stream.remainingError

			// Clear the remaining buffer and error so that the next read will be a read from the websocket frame,
			// unless the error terminates the stream
			stream.remainingBuffer = nil
			stream.remainingError = nil
			return remainingLength, err
		}

		// The remaining buffer doesn't fit inside the argument slice, so copy the bytes that will fit and retain the
		// bytes that don't fit - don't return the remainingError as there are still bytes to be read from the frame
		copy(p, stream.remainingBuffer[:len(p)])
		stream.remainingBuffer = stream.remainingBuffer[len(p):]

		// Return the length of the argument slice as that was the length of the written bytes
		return len(p), nil
	}

	frame, more := <-stream.inputFrames
	stream.channel.logf.Infof("received message %v more: %v", frame, more)
	if more {
		switch op := frame.Payload.(type) {
		case *GrpcFrame_Body:
			//set this in the remaining buffer
			a := make([]byte, 4)
			binary.BigEndian.PutUint32(a, uint32(len(op.Body.Data)))
			stream.remainingBuffer = append(a, op.Body.Data...)
			return stream.Read(p)
		case *GrpcFrame_Error:
			return 0, errors.New("Grpc Client Error")
		}
	}

	return 0, io.EOF
}

func (stream *GrpcStream) Close() error {
	stream.cancel()
	return nil
}

func (stream *GrpcStream) Write(data []byte) (int, error) {
	//what do we do with this?
	//todo add status code OK
	stream.WriteHeader(http.StatusOK)
	err := stream.channel.write(&GrpcFrame{
		StreamId: stream.id,
		Payload: &GrpcFrame_Body{
			Body: &Body{
				Data: data,
			},
		},
	})
	return len(data), err
}

func (stream *GrpcStream) WriteHeader(statusCode int) {
	if !stream.hasWrittenHeaders {
		headerResponse := make(map[string]string)
		for key, element := range stream.responseHeaders {
			if len(element) > 0 {
				headerResponse[key] = element[0]
			}
		}

		stream.hasWrittenHeaders = true
		stream.channel.write(
			&GrpcFrame{
				StreamId: stream.id,
				Payload: &GrpcFrame_Header{
					Header: &Header{
						Operation: "",
						Headers:   headerResponse,
						Status:    int32(statusCode),
					},
				},
			})
	}
}

func (s EchoServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {

	c, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		OriginPatterns: []string{"*"},
	})
	s.logf.Infof("accept websocket %v", r)
	if err != nil {
		s.logf.Logf(logrus.ErrorLevel, "%v", err)
		return
	}
	defer c.Close(websocket.StatusInternalError, "the sky is falling")
	wsChannel := NewWebsocketChannel(c, s.client, r.Context(), s.logf)
	for {
		wsChannel.poll()
	}
}

func main() {
	log.SetFlags(0)

	err := run()
	if err != nil {
		log.Fatal(err)
	}
}

// run starts a http.Server for the passed in address
// with all requests handled by echoServer.
func run() error {
	if len(os.Args) < 2 {
		return errors.New("please provide an address to listen on as the first argument")
	}

	l, err := net.Listen("tcp", os.Args[1])
	if err != nil {
		return err
	}
	log.Printf("listening on http://%v", l.Addr())

	s := &http.Server{
		Handler: EchoServer{
			logf: nil,
		},
		ReadTimeout:  time.Second * 10,
		WriteTimeout: time.Second * 10,
	}
	errc := make(chan error, 1)
	go func() {
		errc <- s.Serve(l)
	}()

	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, os.Interrupt)
	select {
	case err := <-errc:
		log.Printf("failed to serve: %v", err)
	case sig := <-sigs:
		log.Printf("terminating: %v", sig)
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)
	defer cancel()

	return s.Shutdown(ctx)
}
