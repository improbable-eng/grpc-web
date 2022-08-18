# @improbable-eng/grpc-web
> Library for making gRPC-Web requests from a browser

This library is intended for both JavaScript and TypeScript usage from a web browser or NodeJS (see [Usage with NodeJS](#usage-with-nodejs)).

*Note: This only works if the server supports [gRPC-Web](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md)*

A Golang gRPC-Web middleware and a Golang-based gRPC-Web proxy are [available here](https://github.com/improbable-eng/grpc-web).

Please see the full [gRPC-Web README](https://github.com/improbable-eng/grpc-web) for known limitations.

## Installation

`@improbable-eng/grpc-web` has peer dependencies of `google-protobuf` and `@types/google-protobuf`.

`npm install google-protobuf @types/google-protobuf @improbable-eng/grpc-web --save`

## Example Project

There is an [example project available here](https://github.com/improbable-eng/grpc-web/tree/master/client/grpc-web-react-example)

## Usage Overview
* Use [`ts-protoc-gen`](https://www.npmjs.com/package/ts-protoc-gen) with [`protoc`](https://github.com/google/protobuf) to generate `.js` and `.d.ts` files for your request and response classes. `ts-protoc-gen` can also generate gRPC service definitions with the `service=true` argument.
  * [Go to code generation docs](docs/code-generation.md)
* Make a request using [`unary()`](docs/unary.md), [`invoke()`](docs/invoke.md) or [`client()`](docs/client.md)

```javascript
import {grpc} from "@improbable-eng/grpc-web";

// Import code-generated data structures.
import {BookService} from "./generated/proto/examplecom/library/book_service_pb_service";
import {GetBookRequest} from "./generated/proto/examplecom/library/book_service_pb";

const getBookRequest = new GetBookRequest();
getBookRequest.setIsbn(60929871);
grpc.unary(BookService.GetBook, {
  request: getBookRequest,
  host: host,
  onEnd: res => {
    const { status, statusMessage, headers, message, trailers } = res;
    if (status === grpc.Code.OK && message) {
      console.log("all ok. got book: ", message.toObject());
    }
  }
});
```

* Requests can be aborted/closed before they complete:

```javascript
const request = grpc.unary(BookService.GetBook, { ... });
request.close();
```

## Available Request Functions

There are three functions for making gRPC requests:

### [`grpc.unary`](docs/unary.md)
This is a convenience function for making requests that consist of a single request message and single response message. It can only be used with unary methods.

```protobuf
rpc GetBook(GetBookRequest) returns (Book) {}
```

### [`grpc.invoke`](docs/invoke.md)
This is a convenience function for making requests that consist of a single request message and a stream of response messages (server-streaming). It can also be used with unary methods.

```protobuf
rpc GetBook(GetBookRequest) returns (Book) {}
rpc QueryBooks(QueryBooksRequest) returns (stream Book) {}
```

### [`grpc.client`](docs/client.md)
`grpc.client` returns a client. Dependant upon [transport compatibility](docs/transport.md) this client is capable of sending multiple request messages (client-streaming) and receiving multiple response messages (server-streaming). It can be used with any type of method, but will enforce limiting the sending of messages for unary methods.

```protobuf
rpc GetBook(GetBookRequest) returns (Book) {}
rpc QueryBooks(QueryBooksRequest) returns (stream Book) {}
rpc LogReadPages(stream PageRead) returns (google.protobuf.Empty) {}
rpc ListenForBooks(stream QueryBooksRequest) returns (stream Book) {}
```

## Usage with NodeJS
Refer to [grpc-web-node-http-transport](https://www.npmjs.com/package/@improbable-eng/grpc-web-node-http-transport).

## All Docs

* [unary()](docs/unary.md)
* [invoke()](docs/invoke.md)
* [client()](docs/client.md)
* [Code Generation](docs/code-generation.md)
* [Concepts](docs/concepts.md)
* [Transport](docs/transport.md)
* [Client-side streaming](docs/websocket.md)
