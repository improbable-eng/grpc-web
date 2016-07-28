

package main

import (
	"net/http"
	"net"
	"log"
	"google.golang.org/grpc"
	testproto "github.com/mwitkow/grpc-browser-compat/testproto"
	"google.golang.org/grpc/grpclog"
	"os"
	"github.com/golang/protobuf/proto"
	"github.com/golang/protobuf/jsonpb"
	"bytes"
)

func main() {

	//
	//handler := func(resp http.ResponseWriter, req *http.Request) {
	//	resp.WriteHeader(http.StatusOK)
	//	resp.Header().Add("Content-Type", "application/json")
	//	resp.Write([]byte(`{"msg": "hello"}`))
	//	log.Printf("Got request: %v", req)
	//}

	grpcServer := grpc.NewServer(grpc.CustomCodec(NewJsonPBCodec()))
	//grpcServer := grpc.NewServer()
	testproto.RegisterTestServiceServer(grpcServer, &testproto.TestServiceImpl{})
	grpclog.SetLogger(log.New(os.Stderr, "grpc: ", log.LstdFlags))

	grpclog.Print("WOLO")

	httpServer := http.Server{
		Handler: grpcServer,
	}
	listener, err := net.Listen("tcp", ":9090")
	if err != nil {
		log.Fatalf("Failed to listen.")
	}
	log.Printf("Listening on: %s", listener.Addr().String())

	httpServer.Serve(listener)

}


type jsonpbCodec struct{
	m *jsonpb.Marshaler
	u *jsonpb.Unmarshaler
}

func NewJsonPBCodec() *jsonpbCodec {
	return &jsonpbCodec{
		m: &jsonpb.Marshaler{OrigName: true},
		u: &jsonpb.Unmarshaler{},
	}
}

func (c * jsonpbCodec) Marshal(v interface{}) ([]byte, error) {
	out, err := c.m.MarshalToString(v.(proto.Message))
	return []byte(out), err
}

func (c * jsonpbCodec) Unmarshal(data []byte, v interface{}) error {
	bReader := bytes.NewReader(data)
	return c.u.Unmarshal(bReader, v.(proto.Message))
}

func (c * jsonpbCodec) String() string {
	return "json"
}