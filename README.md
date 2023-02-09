# gRPC-Web: Typed Frontend Development


[![CircleCI](https://circleci.com/gh/improbable-eng/grpc-web/tree/master.svg?style=svg)](https://circleci.com/gh/improbable-eng/grpc-web/tree/master)
[![Sauce Test Status](https://app.saucelabs.com/buildstatus/ImprobableEngBot)](https://app.saucelabs.com/u/ImprobableEngBot)
[![NPM](https://img.shields.io/npm/v/@improbable-eng/grpc-web.svg)](https://www.npmjs.com/package/@improbable-eng/grpc-web)
[![GoDoc](http://img.shields.io/badge/GoDoc-Reference-blue.svg)](https://godoc.org/github.com/improbable-eng/grpc-web/go/grpcweb) 
[![Apache 2.0 License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![quality: alpha](https://img.shields.io/badge/quality-alpha-orange.svg)](#status)
[![Slack](https://img.shields.io/badge/join%20slack-%23grpc--web-brightgreen.svg)](https://join.slack.com/t/improbable-eng/shared_invite/enQtMzQ1ODcyMzQ5MjM4LWY5ZWZmNGM2ODc5MmViNmQ3ZTA3ZTY3NzQwOTBlMTkzZmIxZTIxODk0OWU3YjZhNWVlNDU3MDlkZGViZjhkMjc)

> Please note that this repo is in maintenance mode, and we recommend users migrate to the official grpc-web client: https://github.com/grpc/grpc-web.

[gRPC](http://www.grpc.io/) is a modern, [HTTP2](https://hpbn.co/http2/)-based protocol, that provides RPC semantics using the strongly-typed *binary* data format of [protocol buffers](https://developers.google.com/protocol-buffers/docs/overview) across multiple languages (C++, C#, Golang, Java, Python, NodeJS, ObjectiveC, etc.)

[gRPC-Web](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md) is a cutting-edge spec that enables invoking gRPC services from *modern* browsers.

*__If you are looking for gRPC support for Node.js there is an [official Node.js gRPC library](https://www.npmjs.com/package/grpc). This package supports Node.js, but requires that the server has the gRPC-Web compatibility layer (read on to understand more).__*

Components of the stack are based on Golang and TypeScript:

 * [`grpcweb`](./go/grpcweb) - a Go package that wraps an existing `grpc.Server` as a gRPC-Web `http.Handler` for both HTTP2 and HTTP/1.1.
 * [`grpcwebproxy`](./go/grpcwebproxy) - a Go-based stand-alone reverse proxy for classic gRPC servers (e.g. in Java or C++) that exposes their services over gRPC-Web to modern browsers.
 * [`ts-protoc-gen`](https://github.com/improbable-eng/ts-protoc-gen) - a TypeScript plugin for the protocol buffers compiler that provides strongly typed message classes and method definitions.
 * [`@improbable-eng/grpc-web`](./client/grpc-web) - a TypeScript gRPC-Web client library for browsers ([and Node.js](#nodejs-support)).
 
## Why?

With gRPC-Web, it is extremely easy to build well-defined, easy to reason about APIs between browser frontend code and microservices. Frontend development changes significantly:

 * no more hunting down API documentation - `.proto` is the canonical format for API contracts.
 * no more hand-crafted JSON call objects - all requests and responses are strongly typed and code-generated, with hints available in the IDE.
 * no more dealing with methods, headers, body and low level networking - everything is handled by `grpc.invoke`.
 * no more second-guessing the meaning of error codes - [gRPC status codes](https://godoc.org/google.golang.org/grpc/codes) are a canonical way of representing issues in APIs.
 * no more one-off server-side request handlers to avoid concurrent connections - gRPC-Web is based on HTTP2, with multiplexes multiple streams over the [same connection](https://hpbn.co/http2/#streams-messages-and-frames).
 * no more problems streaming data from a server -  gRPC-Web supports both *1:1* RPCs and *1:many* streaming requests.
 * no more data parse errors when rolling out new binaries - [backwards and forwards-compatibility](https://developers.google.com/protocol-buffers/docs/gotutorial#extending-a-protocol-buffer) of requests and responses.

In short, gRPC-Web moves the interaction between frontend code and microservices from the sphere of hand-crafted HTTP requests to well-defined user-logic methods.

## Client-side (grpc-web) Docs

**Note: You'll need to add gRPC-Web compatibility to your server through either [`grpcweb`](go/grpcweb) or [`grpcwebproxy`](go/grpcwebproxy).**

[API Docs for `grpc-web` client can be found here](./client/grpc-web)

## Example 

For a self-contained demo of a Golang gRPC service called from a TypeScript project, see [example](client/grpc-web-react-example). It contains most of the initialization code that performs the magic. Here's the application code extracted from the example:

You use `.proto` files to define your service. In this example, one normal RPC (`GetBook`) and one server-streaming RPC (`QueryBooks`):

```proto
syntax = "proto3";

message Book {
  int64 isbn = 1;
  string title = 2;
  string author = 3;
}

message GetBookRequest {
  int64 isbn = 1;
}

message QueryBooksRequest {
  string author_prefix = 1;
}

service BookService {
  rpc GetBook(GetBookRequest) returns (Book) {}
  rpc QueryBooks(QueryBooksRequest) returns (stream Book) {}
}
```

And implement it in Go (or any other gRPC-supported language):

```go
import pb_library "../_proto/examplecom/library"

type bookService struct{
        books []*pb_library.Book
}

func (s *bookService) GetBook(ctx context.Context, bookQuery *pb_library.GetBookRequest) (*pb_library.Book, error) {
	for _, book := range s.books {
		if book.Isbn == bookQuery.Isbn {
			return book, nil
		}
	}
	return nil, grpc.Errorf(codes.NotFound, "Book could not be found")
}

func (s *bookService) QueryBooks(bookQuery *pb_library.QueryBooksRequest, stream pb_library.BookService_QueryBooksServer) error {
	for _, book := range s.books {
		if strings.HasPrefix(s.book.Author, bookQuery.AuthorPrefix) {
			stream.Send(book)
		}
	}
	return nil
}
```

You will be able to access it in a browser using TypeScript (and equally JavaScript after transpiling):

```javascript
import {grpc} from "@improbable-eng/grpc-web";

// Import code-generated data structures.
import {BookService} from "../_proto/examplecom/library/book_service_pb_service";
import {QueryBooksRequest, Book, GetBookRequest} from "../_proto/examplecom/library/book_service_pb";

const queryBooksRequest = new QueryBooksRequest();
queryBooksRequest.setAuthorPrefix("Geor");
grpc.invoke(BookService.QueryBooks, {
  request: queryBooksRequest,
  host: "https://example.com",
  onMessage: (message: Book) => {
    console.log("got book: ", message.toObject());
  },
  onEnd: (code: grpc.Code, msg: string | undefined, trailers: grpc.Metadata) => {
    if (code == grpc.Code.OK) {
      console.log("all ok")
    } else {
      console.log("hit an error", code, msg, trailers);
    }
  }
});
```

### Usage with React
* [Example project using gRPC-Web with React and Go](https://github.com/easyCZ/grpc-web-hacker-news)

## Browser Support

The `@improbable-eng/grpc-web` client uses multiple techniques to efficiently invoke gRPC services. Most modern browsers support the [Fetch API](https://developer.mozilla.org/en/docs/Web/API/Fetch_API), which allows for efficient reading of partial, binary responses. For older browsers, it automatically falls back to [`XMLHttpRequest`](https://developer.mozilla.org/nl/docs/Web/API/XMLHttpRequest).

The gRPC semantics encourage you to make multiple requests at once. With most modern browsers [supporting HTTP2](http://caniuse.com/#feat=http2), these can be executed over a single TLS connection. For older browsers, gRPC-Web falls back to HTTP/1.1 chunk responses.

This library is tested against:
  * Chrome >= 41
  * Firefox >= 38
  * Edge >= 13
  * IE >= 11
  * Safari >= 8
  
## Node.js Support

The `@improbable-eng/grpc-web` client also [supports Node.js through a transport](./client/grpc-web/docs/transport.md#node-http-only-available-in-a-nodejs-environment) that uses the `http` and `https` packages. Usage does not vary from browser usage as transport is determined at runtime.

If you want to use the `@improbable-eng/grpc-web` client in a node.js environment with Typescript, you must include `dom` in the `"lib"` Array in your `tsconfig.json` otherwise `tsc` will be unable to find some type declarations to compile. Note that `dom` will be included automatically if you do not declare `lib` in your configration and your target is one of `es5` or `es6`. (See [Typescript compiler options](https://www.typescriptlang.org/docs/handbook/compiler-options.html)).

```
{
  "compilerOptions": {
    "lib": [ "dom", /* ... */ ],
  }
}
```

*__Please note - There is an [official Node.js gRPC library](https://www.npmjs.com/package/grpc) that does not require the server to support gRPC-Web__*

### Client-side streaming

It is very important to note that the gRPC-Web spec currently *does not support client-side streaming*. This is unlikely to change until new whatwg fetch/[streams API](https://www.w3.org/TR/streams-api/) lands in browsers. As such, if you plan on using gRPC-Web you're limited to:
 * unary RPCs (1 request 1 response)
 * server-side streaming RPCs (1 request N responses)

This, however, is useful for a lot of frontend functionality.

*Note that `@improbable-eng/grpc-web` provides a built-in [websocket](./client/grpc-web/docs/websocket.md) transport that can support client-side/bi-directional streaming RPCs.*

## Status

The code here is `alpha` quality. It is being used for a subset of Improbable's frontend single-page apps in production.

## Known Limitations
See the `@improbable-eng/grpc-web` client Transport Documentation for [a list of Web Browser caveats](./client/grpc-web/docs/transport.md#http/2-based-transports).

### Contributing
See [CONTRIBUTING](./CONTRIBUTING.md)
