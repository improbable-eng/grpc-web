package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"time"

	grpc "google.golang.org/grpc"
	"google.golang.org/protobuf/proto"
	"nhooyr.io/websocket"
)

// EchoServer is the WebSocket echo server implementation.
// It ensures the client speaks the echo subprotocol and
// only allows one message every 100ms with a 10 message burst.
type EchoServer struct {
	// logf controls where logs are sent.
	logf   func(f string, v ...interface{})
	client grpc.Server
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


func NewEchoServer(log *logrus.Entry,  backendHostPort string) *EchoServer {
	opt := []grpc.DialOption{}
	opt = append(opt, grpc.WithCodec(proxy.Codec()))
	cc, err := grpc.Dial(*backendHostPort, opt...)

	if err == nil {
		return EchoServer {
			logf: log,
			cleint: buildGrpcProxyServer(cc, log),
		}, nil
	} else {
		err
	}
}

type WebsocketChannel struct {
	socket        websocket.Conn
	activeStreams map[int]*GrpcStream
	timeOutInterval time.Duration
	timer           *timer.Timer
	context         context.Context
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
			w.wsConn.Ping(w.context)
		}
	}
}

func (ws *WebsocketChannel) read() (*GrpcFrame,error) {
	//we assume a large limit is set for the websocket to avoid handling multiple frames.
	typ, r, err := c.Reader(ws.context)
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

func (ws *WebsocketChannel) write(frame GrpcFrame) {
	w, err := c.Writer(ws.context, typ)
	if err != nil {
		return err
	}

	if err != nil {
		return fmt.Errorf("failed to io.Copy: %w", err)
	}

	
	binaryFrame, err := proto.Marshal(request)
	if err != nil {
		return err
	}
	
	err := w.Write(binaryFrame)
	
	if err != nil {
		return err
	}

	//todo how to avoid leak do i have to defer the close? 
	err = w.Close()
	return err
}

func (w *WebsocketChannel) Close() {
	//todo check and close the websocket
	for _, gs := range ws.activeStreams {
		gs.close()
	}
}

func (ws *WebsocketChannel) poll() error {
	frame, err := ws.read()
	if err == io.EOF {
		ws.Close()
	}

	if err != nil {
		return err
	}

	stream := ws.activeStreams[int(frame.StreamId)]

	switch op := frame.Payload.(type) {
	case *GrpcFrame_Start:
		request.GetStart().Operation
		if stream != nil {
			return fmt.Errorf("stream with id alredy exists: %w", frame.StreamId)
		}
		
		ws.activeStreams[int(frame.StreamId)] = &GrpcStream{		
			id : frame.StreamId,
			frame: &GrpcFrame{},
			inputFrames: make(chan GrpcFrame, 2), // how many frames should we allow to buffer
		}
	case *GrpcFrame_Body:

	case *GrpcFrame_Cancel:
		fmt.Printf("Insert Operation Rawbytes length: %d\n", len(op.InsertOp.RawBytes))

	case *GrpcFrame_Complete:
	case *GrpcFrame_Error:

	default:
		fmt.Println("No matching operations")
	}
}


type GrpcStream struct {
	id uint32
	hasWrittenHeaders bool
	responseHeaders Header
	inputFrames chan GrpcFrame
	//todo add a context to return to close the connection
}

func (stream *GrpcStream) Header(){
	//todo 
	stream.responseHeaders
}


func (stream *GrpcStream) Write([]byte) (int, error){
	//what do we do with this?
	//todo add status code OK
	stream.WriteHeader()
	//todo write a new data frame.
	//todo how and when to send a close.
	//todo can we close a channel
	
}


func (stream *GrpcStream) WriteHeader(statusCode int){
	if(!stream.hasWrittenHeaders){
		stream.hasWrittenHeaders = true
		stream.outputFrames <- &GrpcFrame{
			StreamId: stream.id,
			Payload: &GrpcFrame_H{} stream.Header,
		}
	}
}

func (stream *GrpcStream) WriteHeader(statusCode int){
	stream.frame
}

func (s EchoServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	c, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		OriginPatterns: []string{"*"},
	})

	if err != nil {
		s.logf("%v", err)
		return
	}
	defer c.Close(websocket.StatusInternalError, "the sky is falling")

	for {
		err = s.read(r.Context(), c)
		if websocket.CloseStatus(err) == websocket.StatusNormalClosure {
			return
		}
		if err != nil {
			s.logf("failed to echo with %v: %v", r.RemoteAddr, err)
			return
		}
	}
}


func (s EchoServer) read(ctx context.Context, c *websocket.Conn) error {

	typ, r, err := c.Reader(ctx)

	if err != nil {
		return err
	}

	bytesValue, err := ioutil.ReadAll(r)
	request := &Message{}
	if err := proto.Unmarshal(bytesValue, request); err != nil {
		fmt.Errorf("error %v", err)
	}
	switch op := request.Payload.(type) {
	case *Message_Start:
		request.GetStart().Operation
		s.client.
	case *Message_Body:

	case *Message_Cancel:
		fmt.Printf("Insert Operation Rawbytes length: %d\n", len(op.InsertOp.RawBytes))

	case *Message_Complete:
	case *Message_Error:

	default:
		fmt.Println("No matching operations")
	}

	w, err := c.Writer(ctx, typ)
	if err != nil {
		return err
	}

	// _, err = io.Copy(w, r)
	if err != nil {
		return fmt.Errorf("failed to io.Copy: %w", err)
	}

	err = w.Close()
	return err
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
			logf: log.Printf,
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
