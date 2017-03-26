# Go gRPC Web Wrapper

The standard [gRPC-Go](http://www.grpc.io/docs/tutorials/basic/go.html) Server implements a
[`ServeHTTP`](https://godoc.org/google.golang.org/grpc#Server.ServeHTTP) method and can be used as a standard
 `http.Handler` of the the Go built-in HTTP2 server.

The `grpcweb` package implements a wrapper around `grpc.Server.ServeHTTP` that exposes the server's gRPC handlers over
gRPC-Web spec, thus making them callable from browsers.

The `grpcwebproxy` is a binary that can act as a reverse proxy for other gRPC servers (in whatever language), exposing
their gRPC functionality to browsers (over HTTP2+TLS+gRPC-Web) without needing to modify their code.