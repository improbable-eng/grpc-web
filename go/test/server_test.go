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

	"github.com/mwitkow/grpc-proxy/proxy"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/proto"
	"nhooyr.io/websocket"
)

// Test_echoServer tests the echoServer by sending it 5 different messages
// and ensuring the responses all match.
func Test_echoServer(t *testing.T) {
	log := logrus.New()
	t.Parallel()
	go startGrpcServer()
	server, err := NewEchoServer(logrus.NewEntry(log), "localhost:50051")
	s := httptest.NewServer(server)

	opt := []grpc.DialOption{}
	opt = append(opt, grpc.WithCodec(proxy.Codec()))
	opt = append(opt, grpc.WithInsecure())
	cc, err := grpc.Dial("localhost:50051", opt...)

	log.Info("started server")
	defer s.Close()

	response, _ := NewGreeterClient(cc).UnaryHello(context.Background(), &HelloRequest{Name: "boris"})
	log.Info(response)
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()

	c, _, err := websocket.Dial(ctx, s.URL, &websocket.DialOptions{
		Subprotocols: []string{"grpc-websocket"},
	})
	log.Info("got websocket")
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close(websocket.StatusInternalError, "the sky is falling")

	StartGrpc(c, 1, "main.Greeter/UnaryHello", make(map[string]string), ctx)
	data, err := proto.Marshal(&HelloRequest{
		Name: "boris 2",
	})
	//todo make this a class for easier tests
	MessageGrpc(c, 1, data, ctx)
	CompleteGrpc(c, 1, ctx)
	log.Info("Reading response")
	_, r, err := c.Reader(ctx)

	if err != nil {
		t.Fatal(err)
	}

	response2 := &GrpcFrame{}
	bytesValue, err := ioutil.ReadAll(r)
	if err := proto.Unmarshal(bytesValue, response2); err != nil {
		fmt.Errorf("error %v", err)
	}

	serverResponse := &HelloReply{}
	if err := proto.Unmarshal(response2.GetBody().GetData(), serverResponse); err != nil {
		fmt.Errorf("error %v", err)
	}
	log.Infof("got server response %v", response2)
	c.Close(websocket.StatusNormalClosure, "")
}

func CompleteGrpc(ws *websocket.Conn, streamId uint32, ctx context.Context) error {
	binarymessage, _ := proto.Marshal(&GrpcFrame{
		StreamId: streamId,
		Payload: &GrpcFrame_Complete{
			Complete: &Complete{},
		},
	})

	return ws.Write(ctx, websocket.MessageBinary, binarymessage)
}

func StartGrpc(ws *websocket.Conn, streamId uint32, op string, headers map[string]string, ctx context.Context) error {
	binarymessage, _ := proto.Marshal(&GrpcFrame{
		StreamId: streamId,
		Payload: &GrpcFrame_Header{
			Header: &Header{
				Operation: op,
				Headers:   headers,
			},
		},
	})

	return ws.Write(ctx, websocket.MessageBinary, binarymessage)
}

func MessageGrpc(ws *websocket.Conn, streamId uint32, data []byte, ctx context.Context) error {
	binarymessage, _ := proto.Marshal(&GrpcFrame{
		StreamId: streamId,
		Payload: &GrpcFrame_Body{
			&Body{
				Data: data,
			},
		},
	})

	return ws.Write(ctx, websocket.MessageBinary, binarymessage)
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
