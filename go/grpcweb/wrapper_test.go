package grpcweb

import (
	"context"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/proto"
	"nhooyr.io/websocket"
)

// Test_echoServer tests the echoServer by sending it 5 different messages
// and ensuring the responses all match.

func message(value string) []byte {
	data, _ := proto.Marshal(&HelloRequest{
		Name: value,
	})
	return data
}

func Test_unaryCall(t *testing.T) {
	log := logrus.New()

	log.Info("started server")

	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	client := setupWrapper(ctx, t)
	defer cancel()

	stream, err := client.StartGrpc(1, "main.Greeter/UnaryHello", make(map[string]string), ctx)

	stream.MessageGrpc(message("boris"), ctx)
	stream.CompleteGrpc(ctx)
	header, _ := stream.Read(ctx)
	serverResponse := stream.ReadResponse(ctx)
	log.Info("Reading response")

	if err != nil {
		t.Fatal(err)
	}

	if err != nil {
		fmt.Errorf("error %v", err)
	}
	log.Infof("got server response %v", serverResponse)

	assert.Equal(t, int32(200), header.GetHeader().Status)
	assert.Equal(t, "hello: boris", serverResponse.Reply)
}

func Test_streamCall(t *testing.T) {
	log := logrus.New()

	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()

	client := setupWrapper(ctx, t)
	defer client.ws.Close(websocket.StatusInternalError, "the sky is falling")

	stream, err := client.StartGrpc(1, "main.Greeter/BiStreamHello", make(map[string]string), ctx)
	if err != nil {
		t.Fatal(err)
	}

	stream.MessageGrpc(message("boris"), ctx)
	stream.MessageGrpc(message("boris2"), ctx)
	stream.CompleteGrpc(ctx)

	log.Info("Reading response")
	header, _ := stream.Read(ctx)
	assert.Equal(t, int32(200), header.GetHeader().Status)

	serverResponse := stream.ReadResponse(ctx)
	assert.Equal(t, "hello1: boris", serverResponse.Reply)

	serverResponse = stream.ReadResponse(ctx)
	assert.Equal(t, "hello2: boris", serverResponse.Reply)

	serverResponse = stream.ReadResponse(ctx)
	assert.Equal(t, "hello1: boris2", serverResponse.Reply)

	serverResponse = stream.ReadResponse(ctx)
	assert.Equal(t, "hello2: boris2", serverResponse.Reply)
}

func Test_MixedCall(t *testing.T) {

	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()

	client := setupWrapper(ctx, t)
	defer client.ws.Close(websocket.StatusInternalError, "the sky is falling")

	stream1, err := client.StartGrpc(1, "main.Greeter/BiStreamHello", make(map[string]string), ctx)
	stream2, err := client.StartGrpc(2, "main.Greeter/BiStreamHello", make(map[string]string), ctx)
	stream3, err := client.StartGrpc(3, "main.Greeter/UnaryHello", make(map[string]string), ctx)

	if err != nil {
		t.Fatal(err)
	}

	//todo make this a class for easier tests
	stream1.MessageGrpc(message("boris"), ctx)
	stream2.MessageGrpc(message("jan"), ctx)
	stream3.MessageGrpc(message("jos"), ctx)
	stream1.MessageGrpc(message("boris2"), ctx)
	stream1.MessageGrpc(message("boris3"), ctx)
	stream3.CompleteGrpc(ctx)
	stream1.CompleteGrpc(ctx)
	stream2.CompleteGrpc(ctx)

	header, _ := stream1.Read(ctx)
	assert.Equal(t, int32(200), header.GetHeader().Status)

	header, _ = stream2.Read(ctx)
	assert.Equal(t, int32(200), header.GetHeader().Status)

	header, _ = stream3.Read(ctx)
	assert.Equal(t, int32(200), header.GetHeader().Status)

	assert.Equal(t, "hello1: boris", stream1.ReadResponse(ctx).Reply)
	assert.Equal(t, "hello2: boris", stream1.ReadResponse(ctx).Reply)

	assert.Equal(t, "hello1: boris2", stream1.ReadResponse(ctx).Reply)
	assert.Equal(t, "hello2: boris2", stream1.ReadResponse(ctx).Reply)

	assert.Equal(t, "hello1: boris3", stream1.ReadResponse(ctx).Reply)
	assert.Equal(t, "hello2: boris3", stream1.ReadResponse(ctx).Reply)

	assert.Equal(t, "hello1: jan", stream2.ReadResponse(ctx).Reply)
	assert.Equal(t, "hello2: jan", stream2.ReadResponse(ctx).Reply)

	assert.Equal(t, "hello: jos", stream3.ReadResponse(ctx).Reply)
}

type WebSocketClient struct {
	ws      *websocket.Conn
	ctx     context.Context
	streams map[uint32]*Stream
}

func newWebsocketClient(ctx context.Context, url string, t *testing.T) *WebSocketClient {
	ws, _, err := websocket.Dial(ctx, url, &websocket.DialOptions{
		Subprotocols: []string{"grpc-websocket-channel"},
	})

	if err != nil {
		t.Fatal(err)
	}

	return &WebSocketClient{
		ws:      ws,
		ctx:     ctx,
		streams: make(map[uint32]*Stream),
	}
}

func (client *WebSocketClient) startReading() {
	for {
		frame, _ := client.readFrame()
		if frame == nil {
			return
		}
		fmt.Printf("got frame %v\n", frame)
		if stream, ok := client.streams[frame.StreamId]; ok {
			//do something here
			stream.channel <- frame
		}

	}
}

func (client *WebSocketClient) readFrame() (*GrpcFrame, error) {
	//we assume a large limit is set for the websocket to avoid handling multiple frames.
	typ, bytesValue, err := client.ws.Read(client.ctx)
	if err != nil {
		return nil, err
	}

	if typ != websocket.MessageBinary {
		return nil, errors.New("websocket channel only supports binary messages")
	}

	request := &GrpcFrame{}
	if err := proto.Unmarshal(bytesValue, request); err != nil {
		return nil, fmt.Errorf("error in unwrapping frame %v", err)
	}
	return request, nil
}

func (client *WebSocketClient) StartGrpc(streamId uint32, op string, headers map[string]string, ctx context.Context) (*Stream, error) {
	stream := &Stream{client: client, streamId: streamId, ctx: ctx, channel: make(chan *GrpcFrame, 100)}
	client.streams[streamId] = stream

	grpcHeaders := make(map[string]*HeaderValue)
	for k, v := range headers {
		grpcHeaders[k] = &HeaderValue{
			Value: []string{v},
		}
	}
	binarymessage, _ := proto.Marshal(&GrpcFrame{
		StreamId: streamId,
		Payload: &GrpcFrame_Header{
			Header: &Header{
				Operation: op,
				Headers:   grpcHeaders,
			},
		},
	})

	err := client.ws.Write(ctx, websocket.MessageBinary, binarymessage)
	return stream, err
}

type Stream struct {
	client   *WebSocketClient
	streamId uint32
	ctx      context.Context
	channel  chan *GrpcFrame
}

func (stream *Stream) Read(ctx context.Context) (*GrpcFrame, bool) {
	frame, more := <-stream.channel
	return frame, more
}

func (stream *Stream) ReadResponse(ctx context.Context) *HelloReply {
	serverResponse := &HelloReply{}
	frame, _ := stream.Read(ctx)
	proto.Unmarshal(frame.GetBody().GetData(), serverResponse)
	return serverResponse
}

func (stream *Stream) CompleteGrpc(ctx context.Context) error {
	binarymessage, _ := proto.Marshal(&GrpcFrame{
		StreamId: stream.streamId,
		Payload: &GrpcFrame_Complete{
			Complete: &Complete{},
		},
	})

	return stream.client.ws.Write(ctx, websocket.MessageBinary, binarymessage)
}

func (stream *Stream) MessageGrpc(data []byte, ctx context.Context) error {
	messageSize := len(data)
	framedMessage := make([]byte, messageSize+5)
	binary.BigEndian.PutUint32(framedMessage[1:], uint32(messageSize))
	copy(framedMessage[5:], data)

	binarymessage, _ := proto.Marshal(&GrpcFrame{
		StreamId: stream.streamId,
		Payload: &GrpcFrame_Body{
			&Body{
				Data: framedMessage,
			},
		},
	})

	return stream.client.ws.Write(ctx, websocket.MessageBinary, binarymessage)

}

type serverHandler struct {
	UnimplementedGreeterServer
}

func (*serverHandler) UnaryHello(ctx context.Context, req *HelloRequest) (*HelloReply, error) {
	fmt.Printf("UnaryHello got %v\n", req)
	return &HelloReply{Reply: "hello: " + req.Name}, nil
}

func (*serverHandler) BiStreamHello(stream Greeter_BiStreamHelloServer) error {
	fmt.Println("BiStreamHello started")
	waitc := make(chan struct{})

	for {
		msg, err := stream.Recv()
		fmt.Printf("BiStreamHello got %v\n", msg)
		if err == io.EOF {
			close(waitc)
			fmt.Println("BiStreamHello finished")
			return nil
		}
		if err != nil {
			return err
		}
		stream.Send(&HelloReply{Reply: "hello1: " + msg.Name})
		stream.Send(&HelloReply{Reply: "hello2: " + msg.Name})
	}
}

func createGrpcServer() *grpc.Server {
	var opts []grpc.ServerOption
	grpcServer := grpc.NewServer(opts...)
	RegisterGreeterServer(grpcServer, &serverHandler{})
	return grpcServer
}

func setupWrapper(ctx context.Context, t *testing.T) *WebSocketClient {
	wrapper := WrapServer(createGrpcServer())
	server := httptest.NewServer(wrapper)
	client := newWebsocketClient(ctx, server.URL, t)
	go client.startReading()
	return client
}
