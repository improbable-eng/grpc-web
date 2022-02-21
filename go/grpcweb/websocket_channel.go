package grpcweb

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/desertbit/timer"
	"google.golang.org/grpc/grpclog"
	"google.golang.org/protobuf/proto"
	"nhooyr.io/websocket"
)

type WebsocketChannel struct {
	socket          *websocket.Conn
	activeStreams   map[uint32]*GrpcStream
	timeOutInterval time.Duration
	timer           *timer.Timer
	context         context.Context
	handler         http.Handler
	maxStreamCount  int
	req             *http.Request
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

func NewWebsocketChannel(websocket *websocket.Conn, handler http.Handler, ctx context.Context, maxStreamCount int, req *http.Request) *WebsocketChannel {
	return &WebsocketChannel{
		socket:          websocket,
		activeStreams:   make(map[uint32]*GrpcStream),
		timeOutInterval: 10 * time.Second,
		timer:           nil,
		context:         ctx,
		handler:         handler,
		maxStreamCount:  maxStreamCount,
		req:             req,
	}
}

func newGrpcStream(streamId uint32, channel *WebsocketChannel, streamBufferSize int) *GrpcStream {
	ctx, cancel := context.WithCancel(channel.context)
	return &GrpcStream{
		id: streamId,
		// how many frames should we allow to buffer to avoid blocking the websocket
		inputFrames:     make(chan *GrpcFrame, streamBufferSize),
		channel:         channel,
		ctx:             ctx,
		cancel:          cancel,
		responseHeaders: make(http.Header),
	}
}

func (stream *GrpcStream) Flush() {}

func (stream *GrpcStream) Header() http.Header {
	return stream.responseHeaders
}

func (stream *GrpcStream) Read(p []byte) (int, error) {
	grpclog.Infof("reading from channel %v", stream.id)
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
		copied := copy(p, stream.remainingBuffer[:len(p)])
		stream.remainingBuffer = stream.remainingBuffer[copied:]

		// Return the length of the argument slice as that was the length of the written bytes
		return copied, nil
	}

	frame, more := <-stream.inputFrames
	grpclog.Infof("received message %v more: %v", frame, more)
	if more {
		switch op := frame.Payload.(type) {
		case *GrpcFrame_Body:
			stream.remainingBuffer = op.Body.Data
			return stream.Read(p)
		case *GrpcFrame_Failure:
			//todo how to propagate this to the server?
			return 0, errors.New("Grpc Client Error")
		}
	}
	return 0, io.EOF
}

func (ws *WebsocketChannel) Start() {
	for {
		ws.poll()
	}
}

func (ws *WebsocketChannel) writeError(streamId uint32, message string) error {
	return ws.write(
		&GrpcFrame{
			StreamId: streamId,
			Payload: &GrpcFrame_Failure{
				&Failure{
					ErrorMessage: message,
				},
			},
		},
	)

}

func (ws *WebsocketChannel) poll() error {

	frame, err := ws.readFrame()
	if err == io.EOF {
		ws.Close()
	}

	if err != nil {
		return err
	}

	stream := ws.activeStreams[frame.StreamId]

	switch op := frame.Payload; op.(type) {
	case *GrpcFrame_Header:
		grpclog.Infof("reveived Header for stream %v %v", frame.StreamId, frame.GetHeader().Operation)
		if stream != nil {
			ws.writeError(frame.StreamId, "stream already exists")
		}

		// todo make this configurable how many frames should we allow to buffer to avoid blocking the websocket

		// if ws.maxStreamCount > 0 && ws.maxStreamCount > len(ws.activeStreams) {
		stream := newGrpcStream(frame.StreamId, ws, 1000)
		ws.activeStreams[frame.StreamId] = stream

		url, err := url.Parse("http://localhost/")
		url.Scheme = ws.req.URL.Scheme
		url.Host = ws.req.URL.Host
		url.Path = frame.GetHeader().Operation

		if err != nil {
			return ws.writeError(frame.StreamId, err.Error())
		}

		req := &http.Request{
			Method: http.MethodPost,
			URL:    url,
			Header: make(map[string][]string),
			Body:   stream,
		}
		for key, element := range frame.GetHeader().Headers {
			req.Header[key] = element.Value
		}
		grpclog.Infof("starting grpc request to %v %v", url, req)
		//todo add handler to the websocket channel and then forward it to this.
		interceptedRequest := makeGrpcRequest(req.WithContext(stream.ctx))
		grpclog.Infof("starting call to http server %v", interceptedRequest)
		go ws.handler.ServeHTTP(stream, interceptedRequest)
		// } else {
		// 	if err != nil {
		// 		return ws.writeError(frame.StreamId, "rejecting max number of streams reached for this channel")
		// 	}
		// }

	case *GrpcFrame_Body:
		grpclog.Infof("reveived Body for stream %v", frame.StreamId)
		if stream == nil {
			//todo return this as an error frame to the socket
			return ws.writeError(frame.StreamId, "stream does not exist")
		} else {
			grpclog.Infof("received body %v", frame)
			stream.inputFrames <- frame
		}
	case *GrpcFrame_Cancel:
		grpclog.Infof("reveived Cancel for stream %v", frame.StreamId)
		if stream == nil {
			//todo return this as an error frame to the socket
			return ws.writeError(frame.StreamId, "stream does not exist")
		} else {
			grpclog.Infof("stream %v is canceled", frame.StreamId)
			stream.cancel()
			close(stream.inputFrames)
			delete(ws.activeStreams, frame.StreamId)
		}
	case *GrpcFrame_Complete:
		grpclog.Infof("reveived Complete for stream %v", frame.StreamId)
		if stream == nil {
			//todo return this as an error frame to the socket
			return ws.writeError(frame.StreamId, "stream does not exist")
		} else {
			grpclog.Infof("completing stream %v", frame.StreamId)
			close(stream.inputFrames)
			delete(ws.activeStreams, frame.StreamId)
		}
	case *GrpcFrame_Failure:
		grpclog.Infof("reveived Failure for stream %v", frame.StreamId)
		if stream == nil {
			//todo return this as an error frame to the socket
			return ws.writeError(frame.StreamId, "stream does not exist")
		} else {

			grpclog.Infof("error on stream %v: %v", frame.StreamId, frame.GetFailure().ErrorMessage)
			stream.inputFrames <- frame
			close(stream.inputFrames)
			delete(ws.activeStreams, frame.StreamId)
		}
	default:

	}
	return nil
}

func makeGrpcRequest(req *http.Request) *http.Request {
	// Hack, this should be a shallow copy, but let's see if this works
	req.ProtoMajor = 2
	req.ProtoMinor = 0
	req.Header.Set("content-type", "application/grpc+proto")
	req.Header.Set("grpc-encoding", "identity")
	req.Header.Del("content-length")
	return req
}

func (ws *WebsocketChannel) readFrame() (*GrpcFrame, error) {
	//we assume a large limit is set for the websocket to avoid handling multiple frames.
	typ, bytesValue, err := ws.socket.Read(ws.context)
	if err != nil {
		return nil, err
	}

	if typ != websocket.MessageBinary {
		return nil, errors.New("websocket channel only supports binary messages")
	}

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

func (w *WebsocketChannel) EnablePing(timeOutInterval time.Duration) {
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

func (ws *WebsocketChannel) Close() {
}

func (stream *GrpcStream) Close() error {
	stream.cancel()
	return nil
}

func (stream *GrpcStream) Write(data []byte) (int, error) {
	stream.WriteHeader(http.StatusOK)
	grpclog.Infof("write body %v", len(data))
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
		headerResponse := make(map[string]*HeaderValue)
		for key, element := range stream.responseHeaders {
			headerResponse[key] = &HeaderValue{
				Value: element,
			}
		}
		grpclog.Infof("write headers %v %v", statusCode, headerResponse)
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
