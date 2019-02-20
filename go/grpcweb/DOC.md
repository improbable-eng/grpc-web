# grpcweb
--
    import "github.com/improbable-eng/grpc-web/go/grpcweb"

`grpcweb` implements the gRPC-Web spec as a wrapper around a gRPC-Go Server.

It allows web clients (see companion JS library) to talk to gRPC-Go servers over
the gRPC-Web spec. It supports HTTP/1.1 and HTTP2 encoding of a gRPC stream and
supports unary and server-side streaming RPCs. Bi-di and client streams are
unsupported due to limitations in browser protocol support.

See https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md for the
protocol specification.

Here's an example of how to use it inside an existing gRPC Go server on a
separate http.Server that serves over TLS:

    grpcServer := grpc.Server()
    wrappedGrpc := grpcweb.WrapServer(grpcServer)
    tlsHttpServer.Handler = http.HandlerFunc(func(resp http.ResponseWriter, req *http.Request) {
    	if wrappedGrpc.IsGrpcWebRequest(req) {
    		wrappedGrpc.ServeHTTP(resp, req)
    	}
    	// Fall back to other servers.
    	http.DefaultServeMux.ServeHTTP(resp, req)
    })

If you'd like to have a standalone binary, please take a look at `grpcwebproxy`.

## Usage

#### type Option

```go
type Option func(*options)
```


#### func  WithWebsockets

```go
func WithWebsockets(enableWebsockets bool) Option
```
WithWebsockets allows for handling grpc-web requests of websockets - enabling
bidirectional requests.

The default behaviour is false, i.e. to disallow websockets

#### type WrappedGrpcServer

```go
type WrappedGrpcServer struct {
}
```


#### func  WrapServer

```go
func WrapServer(server *grpc.Server, options ...Option) *WrappedGrpcServer
```
WrapServer takes a gRPC Server in Go and returns a WrappedGrpcServer that
provides gRPC-Web Compatibility.

The internal implementation fakes out a http.Request that carries standard gRPC,
and performs the remapping inside http.ResponseWriter, i.e. mostly the
re-encoding of Trailers (that carry gRPC status).

#### func (*WrappedGrpcServer) HandleGrpcWebRequest

```go
func (w *WrappedGrpcServer) HandleGrpcWebRequest(resp http.ResponseWriter, req *http.Request)
```
HandleGrpcWebRequest takes a HTTP request that is assumed to be a gRPC-Web
request and wraps it with a compatibility layer to transform it to a standard
gRPC request for the wrapped gRPC server and transforms the response to comply
with the gRPC-Web protocol.

#### func (*WrappedGrpcServer) HandleGrpcWebsocketRequest

```go
func (w *WrappedGrpcServer) HandleGrpcWebsocketRequest(resp http.ResponseWriter, req *http.Request)
```
HandleGrpcWebsocketRequest takes a HTTP request that is assumed to be a
gRPC-Websocket request and wraps it with a compatibility layer to transform it
to a standard gRPC request for the wrapped gRPC server and transforms the
response to comply with the gRPC-Web protocol.

#### func (*WrappedGrpcServer) IsGrpcWebRequest

```go
func (w *WrappedGrpcServer) IsGrpcWebRequest(req *http.Request) bool
```
IsGrpcWebRequest determines if a request is a gRPC-Web request by checking that
the "content-type" is "application/grpc-web" and that the method is POST.

#### func (*WrappedGrpcServer) IsGrpcWebSocketRequest

```go
func (w *WrappedGrpcServer) IsGrpcWebSocketRequest(req *http.Request) bool
```
IsGrpcWebSocketRequest determines if a request is a gRPC-Web request by checking
that the "Sec-Websocket-Protocol" header value is "grpc-websockets"

#### func (*WrappedGrpcServer) ServeHTTP

```go
func (w *WrappedGrpcServer) ServeHTTP(resp http.ResponseWriter, req *http.Request)
```
ServeHTTP takes a HTTP request and if it is a gRPC-Web request wraps it with a
compatibility layer to transform it to a standard gRPC request for the wrapped
gRPC server and transforms the response to comply with the gRPC-Web protocol.
