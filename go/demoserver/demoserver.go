package main

import (
	"flag"
	"log"
	"net/http"
	"os"

	"google.golang.org/grpc"
	"google.golang.org/grpc/grpclog"

	"crypto/tls"
	"fmt"

	testproto "github.com/mwitkow/grpc-web/go/_proto/mwitkow/grpcweb/test"
	"github.com/mwitkow/grpc-web/go/grpcweb"
	"github.com/rs/cors"
)

var (
	port            = flag.Int("port", 9090, "Port to listen on.")
	useTls          = flag.Bool("tls", true, "Whether to use TLS.")
	forceHttp1      = flag.Bool("http1", false, "Whether to force the server to serve over HTTP1.1")
	tlsCertFilePath = flag.String("tls_cert_file", "../../misc/localhost.crt", "Path to the CRT/PEM file.")
	tlsKeyFilePath  = flag.String("tls_key_file", "../../misc/localhost.key", "Path to the private key file.")
)

func main() {
	flag.Parse()

	grpcServer := grpc.NewServer()
	testproto.RegisterTestServiceServer(grpcServer, &demoTestService{})
	grpclog.SetLogger(log.New(os.Stdout, "demoserver: ", log.LstdFlags))

	handler := func(resp http.ResponseWriter, req *http.Request) {
		log.Printf("Got request: %v", req)
		grpcweb.WrapServer(grpcServer)(resp, req)
	}

	corsWrapper := cors.New(cors.Options{
		AllowOriginFunc:  func(origin string) bool { return true },
		AllowedHeaders:   []string{"*"}, // allow all headers
		AllowCredentials: true,
	})

	httpServer := http.Server{
		Addr:    fmt.Sprintf(":%d", *port),
		Handler: corsWrapper.Handler(http.HandlerFunc(handler)),
	}
	if *forceHttp1 {
		// disables h2 next proto negotiation, forcing any browser to use HTTP1.
		httpServer.TLSNextProto = map[string]func(*http.Server, *tls.Conn, http.Handler){}
	}

	grpclog.Printf("Starting on localhost:%d tls:%t http1:%t", *port, *useTls, *forceHttp1)

	if !*useTls {
		if err := httpServer.ListenAndServe(); err != nil {
			grpclog.Fatalf("failed starting server: %v", err)
		}
	} else {
		if err := httpServer.ListenAndServeTLS(*tlsCertFilePath, *tlsKeyFilePath); err != nil {
			grpclog.Fatalf("failed starting server: %v", err)
		}
	}
}
