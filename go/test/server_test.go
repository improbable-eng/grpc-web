package main

import (
	"context"
	"fmt"
	"io"
	"io/ioutil"
	"net"
	"net/http/httptest"
	"testing"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/protobuf/proto"
	"nhooyr.io/websocket"
)

// Test_echoServer tests the echoServer by sending it 5 different messages
// and ensuring the responses all match.
func Test_echoServer(t *testing.T) {
	t.Parallel()
	startGrpcServer()
	s := httptest.NewServer(EchoServer{
		logf: t.Logf,
	})
	defer s.Close()

	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()

	c, _, err := websocket.Dial(ctx, s.URL, &websocket.DialOptions{
		Subprotocols: []string{"grpc-websocket"},
	})
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close(websocket.StatusInternalError, "the sky is falling")

	request, _ := proto.Marshal(&HelloRequest{
		Name: "boris",
	})

	binarymessage, err := proto.Marshal(&Message{
		StreamId: 1,
		Payload: &Message_Start{
			Start: &Start{
				Url:     "operation",
				Request: request,
			},
		},
	})

	c.Write(ctx, websocket.MessageBinary, binarymessage)

	_, r, err := c.Reader(ctx)

	response := &Message{}
	bytesValue, err := ioutil.ReadAll(r)
	if err := proto.Unmarshal(bytesValue, response); err != nil {
		fmt.Errorf("error %v", err)
	}

	serverResponse := &HelloReply{}

	if err := proto.Unmarshal(bytesValue, serverResponse); err != nil {
		fmt.Errorf("error %v", err)
	}
	println(serverResponse.Reply)
	c.Close(websocket.StatusNormalClosure, "")
}

type server struct {
	UnimplementedGreeterServer
}

func (*server) UnaryHello(ctx context.Context, req *HelloRequest) (*HelloReply, error) {
	return &HelloReply{
		Reply: "hello: " + req.Name,
	}, nil
}

func (*server) BiStreamHello(stream Greeter_BiStreamHelloServer) error {
	waitc := make(chan struct{})

	for {
		msg, err := stream.Recv()
		if err == io.EOF {
			close(waitc)
			return nil
		}
		if err != nil {
			return err
		}
		stream.Send(&HelloReply{Reply: "hello: " + msg.Name})
	}

	<-waitc
	return nil
}

func startGrpcServer() {
	var opts []grpc.ServerOption
	grpcServer := grpc.NewServer(opts...)
	RegisterGreeterServer(grpcServer, &server{})
	lis, _ := net.Listen("tcp", fmt.Sprintf("localhost:%d", 50051))
	grpcServer.Serve(lis)
}

// type WebsocketClient struct {
// 	connection websocket.Conn
// 	currentStream
// }

// func (*WebsocketClient) stream{

// }
