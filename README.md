# gRPC Browser Compatibility demostrator

This is a demonstrator project of how to make Browser-compatible (no trailer headers) requests against gRPC servers
written in go.

The actual code that enables it is in:
 * https://github.com/grpc/grpc-go/commit/075b162541e4f7ac57dd8e125dfcc74d639e3498
 * https://github.com/mwitkow/grpc-go/tree/feature/browser_compatible_transport
 
 
If you want to try this out you need to:


```bash
cd $GOPATH
go get google.golang.org/grpc
cd src/google.golang.org/grpc
git remote add mwitkow git@github.com:mwitkow/grpc-go.git
git fetch mwitkow
git checkout mwitkow/feature/browser_compatible_transport
```


At this point your local grpc library will contain the patch.


## What does this do?

You can make gRPC requests (although including [gRPC binary message preamble](http://www.grpc.io/docs/guides/wire.html))
using any HTTP/1.1 client, or a HTTP2 client that doesn't support trailer requests.

Together with [protobuf.js](https://github.com/dcodeIO/ProtoBuf.js/) and a dispatching client that uses
[jonnyreeves' chunked-request](https://github.com/jonnyreeves/chunked-request) it should be possible to autogenerate
gRPC clients in a browser.


 


