# gRPC-Web for Golang and TypeScript

This repository implements the upcoming [gRPC-Web spec](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md) allowing for invoking gRPC services from modern browsers (Chrome >= 40.0, Firefox >= 39, Safari >=10, IE >= 10). 

The stack consists of :
 * a Go `http.Handler` that exposes a `grpc.Server` with gRPC-Web wrapping over both HTTP2 and HTTP1.1 (*done*)
 * a TypeScript library (usable in ES5) that implements for invoking gRPC-Web endpoints (*in progress*)
 * a TypeScript `protoc` plugin that code-generates TypeScript types and service stubs around the library (*in progress)
 * a Go-based gRPC Proxy Server that allows exposing non-gRPC-Web enabled gRPC services (*todo*) 
 

## gRPC and browsers

The biggest problem with Browser as gRPC clients, is that that they do not support accessing `Trailer` headers. A discussion is happening in [fetch#34](https://github.com/whatwg/fetch/issues/34) 
to add them to the `fetch` standard, but actual implementation in browsers is very much in the future.

The [gRPC-Web spec](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md) works around this by moving the `Trailer` headers into the response stream (`DATA` frames for HTTP2 calls, chunked body for HTTP1.1) and encoding them as HTTP1.1 headers in yet-another gRPC [`Delimited-Message`](http://www.grpc.io/docs/guides/wire.html).

It is very important to note that gRPC-Web currently *does not support client-side streaming*. This is unlikely to change until until new whatwg fetch/[streams API](https://www.w3.org/TR/streams-api/) lands in browsers. As such, if you plan on using gRPC-Web you're limited to:
 * unary RPCs (1 request 1 response)
 * server-side streaming RPCs (1 request N responses)

## Status

At the moment this repo holds:
 * a Go `http.Handler` that exposes a `grpc.Server` with gRPC-Web wrapping over both HTTP2 and HTTP1.1 (*done*)
 * a JavaScript `playground` proof of concept

The implementation is in **experimental** stage, and we're trying it out on Improbable Platform's staging environment.

### Trying it out

Install the `localhost` certificates of this repo found in `misc/`. Follow [this guide](http://stackoverflow.com/questions/7580508/getting-chrome-to-accept-self-signed-localhost-certificate) for Chrome.

Run the Golang demoserver:
```
go get github.com/improbable-eng/grpc-web/go/demoserver
cd ${GOPATH}/github.com/improbable-eng/grpc-web/go/demoserver
go build
./demoserver 
```
Run the JS `playground` against the DemoServer
```
cd  ${GOPATH}/github.com/improbable-eng/grpc-web/js/playground
npm start
```
Point your browser a https://localhost:8081/index.html and open the Developer Console.



