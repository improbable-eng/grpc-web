# gRPC Browser Compatibility demostrator

This is a demonstrator project of how to make Browser-compatible requests against gRPC servers.

## gRPC and browsers

The biggest problem with Browser clients, is that although the vast majority of them support HTTP2, 
do not support accessing `Trailer` headers. A discussion is happening in [fetch#34](https://github.com/whatwg/fetch/issues/34) 
to add them to the `fetch` standard, but support is waay off.

The idea is to encode the values of `Trailer` headers (including gRPC status codes) in a protobuf
(see [terminator.proto](terminator.proto) that is sent as `DATA` of the stream instead of as 
headers. This makes it accessible to Browser clients through normal APIs. The presence of the 
terminator is signalled by frame starting with `0xDEADE` and followed by a normal gRPC [delimited message](http://www.grpc.io/docs/guides/wire.html)
containing the status code, status message and additional user trailers.

## Implementation

The implementation is an `http.Handler` that acts as Middleware wrapping a `grpc.Server`. It 
intercepts the request and checks if a `:grpc-browser-compat` header is contained within it. If not,
normal gRPC wire protocol semantics are followed. If it exists the Terminator proto is used.

Basically:

```go
httpServer := http.Server{
		Handler: grpc_browser_compat.Middleware(grpcServer),
}
```

## Status

### HTTP2 Browser support.

You can make gRPC requests from a Browser-like clients. You need to prefix each message with
the [gRPC binary message delimiter](http://www.grpc.io/docs/guides/wire.html)) (5 bytes) and use
protobuf encoding. 

Together with [protobuf.js](https://github.com/dcodeIO/ProtoBuf.js/) and a dispatching client that uses
[jonnyreeves' chunked-request](https://github.com/jonnyreeves/chunked-request) it should be
 possible to autogenerate gRPC clients in a browser.

**TODO(michal)**: Update this section when work is done.

### HTTP1.1 support

This kinda-sorta-works now. The gRPC Message Delimiters are written as Chunked-Encoding stream back
to the client. This means that the response looks something like:

```
<chunk-length-in-ascii-int>\r\n
<grpc-message-delimiter><message-payload>
```

This is not ideal, as you have a double representation of the lenght of the message.

It would be possible to reimplement the grpc-message-delimiter as chunked encoded values, but its
not needed now.

### Debug mode

Binary protocols are hard to troubleshoot. Once the browser-end of the implementation is done, would
be useful to come up with an ASCII translation of the `grpc-message-delimiter` making it easy to 
debug.

More crucially, gRPC would have to support multiple codecs. See [grpc-go#803](https://github.com/grpc/grpc-go/issues/803)



