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
    	if grpcweb.IsGrpcRequest(req) {
    		wrappedGrpc.ServeHTTP(resp, req)
    	}
    	// Fall back to other servers.
    	http.DefaultServeMux.ServeHTTP(resp, req)
    })

If you'd like to have a standalone binary, please take a look at `grpcwebproxy`.

## Usage

#### func  IsGrpcRequest

```go
func IsGrpcRequest(r *http.Request) bool
```
IsGrpcRequest checks whether the given request is a gRPC-Web or gRPC-standard
request.

#### func  ListGRPCResources

```go
func ListGRPCResources(server *grpc.Server) []string
```
ListGRPCResources is a helper function that lists all URLs that are registered
on gRPC server.

This makes it easy to register all the relevant routes in your HTTP router of
choice.

#### func  WrapServer

```go
func WrapServer(server *grpc.Server, options ...Option) http.HandlerFunc
```
WrapServer takes a gRPC Server in Go and returns an http.HandlerFunc that adds
gRPC-Web Compatibility.

The internal implementation fakes out a http.Request that carries standard gRPC,
and performs the remapping inside http.ResponseWriter, i.e. mostly the
re-encoding of Trailers (that carry gRPC status).

You can control the behaviour of the wrapper (e.g. modifying CORS behaviour)
using `With*` options.

#### type Option

```go
type Option func(*options)
```


#### func  WithAllowedRequestHeaders

```go
func WithAllowedRequestHeaders(headers []string) Option
```
WithAllowedResponseHeaders allows for customizing what gRPC request headers a
browser can add.

This is controlling the CORS pre-flight `Access-Control-Allow-Headers` method
and applies to *all* gRPC handlers. However, a special `*` value can be passed
in that allows the browser client to provide *any* header, by explicitly
whitelisting all `Access-Control-Request-Headers` of the pre-flight request.

The default behaviour is `[]string{'*'}`, allowing all browser client headers.
This option overrides that default, while maintaining a whitelist for
gRPC-internal headers.

Unfortunately, since the CORS pre-flight happens independently from gRPC handler
execution, it is impossible to automatically discover it from the gRPC handler
itself.

The relevant CORS pre-flight docs:
https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Headers

#### func  WithOriginFunc

```go
func WithOriginFunc(originFunc func(origin string) bool) Option
```
WithOriginFunc allows for customizing what CORS Origin requests are allowed.

This is controlling the CORS pre-flight `Access-Control-Allow-Origin`. This
mechanism allows you to limit the availability of the APIs based on the domain
name of the calling website (Origin). You can provide a function that filters
the allowed Origin values.

The default behaviour is `*`, i.e. to allow all calling websites.

The relevant CORS pre-flight docs:
https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin
