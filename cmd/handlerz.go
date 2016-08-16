package main

import (
	"bytes"
	"flag"
	"log"
	"net"
	"net/http"
	"os"



	"github.com/golang/protobuf/jsonpb"
	"github.com/golang/protobuf/proto"
	testproto "github.com/mwitkow/grpc-browser-compat/cmd/testproto"
	"google.golang.org/grpc"
	"google.golang.org/grpc/grpclog"
	"github.com/mwitkow/grpc-browser-compat"
	"github.com/rs/cors"
)

var (
	useTls          = flag.Bool("tls", true, "Whether to use TLS and HTTP2.")
	tlsCertFilePath = flag.String("tls_cert_file", "../misc/localhost.crt", "Path to the CRT/PEM file.")
	tlsKeyFilePath  = flag.String("tls_key_file", "../misc/localhost.key", "Path to the private key file.")
)

func main() {
	flag.Parse()



	//grpcServer := grpc.NewServer(grpc.CustomCodec(NewJsonPBCodec()))
	grpcServer := grpc.NewServer()
	testproto.RegisterTestServiceServer(grpcServer, &testproto.TestServiceImpl{})
	grpclog.SetLogger(log.New(os.Stderr, "grpc: ", log.LstdFlags))

	grpclog.Print("WOLO")


	corsWrapper := cors.New(cors.Options{
		AllowOriginFunc: func(origin string) bool { return true },
		AllowedHeaders: []string{"*"}, // allow all headers
		AllowCredentials: true,
	})

	handler := func(resp http.ResponseWriter, req *http.Request) {
		//resp.WriteHeader(http.StatusOK)
		//resp.Header().Add("Content-Type", "application/json")
		//resp.Write([]byte(`{"msg": "hello"}`))
		//log.Printf("Got request: %v", req)
		log.Printf("Got request: %v", req)
		grpc_browser_compat.Middleware(grpcServer)(resp, req)
	}

	httpServer := http.Server{
		//Handler: grpc_browser_compat.Middleware(grpcServer),
		Handler: corsWrapper.Handler(http.HandlerFunc(handler)),
	}
	if !*useTls {
		listener, err := net.Listen("tcp", ":9090")
		if err != nil {
			log.Fatalf("Failed to listen.")
		}
		log.Printf("Listening on: %s", listener.Addr().String())
		httpServer.Serve(listener)
	} else {
		httpServer.Addr = ":9090"
		log.Printf("Listening TLS on: :9090")
		if err := httpServer.ListenAndServeTLS(*tlsCertFilePath, *tlsKeyFilePath); err != nil {
			log.Fatalf("Failed starting server: %v", err)
		}
	}
}

type jsonpbCodec struct {
	m *jsonpb.Marshaler
	u *jsonpb.Unmarshaler
}

func NewJsonPBCodec() *jsonpbCodec {
	return &jsonpbCodec{
		m: &jsonpb.Marshaler{OrigName: true},
		u: &jsonpb.Unmarshaler{},
	}
}

func (c *jsonpbCodec) Marshal(v interface{}) ([]byte, error) {
	out, err := c.m.MarshalToString(v.(proto.Message))
	return []byte(out), err
}

func (c *jsonpbCodec) Unmarshal(data []byte, v interface{}) error {
	bReader := bytes.NewReader(data)
	return c.u.Unmarshal(bReader, v.(proto.Message))
}

func (c *jsonpbCodec) String() string {
	return "json"
}
