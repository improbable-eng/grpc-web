# grpc-web-client
> Library for making gRPC-Web requests from a Browser

This library is intended for both JavaScript and TypeScript usage from either a browser or Node.js.

*Note: This only works if the server supports [gRPC-Web](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md)*

A Golang gRPC-Web middleware and a Golang-based gRPC-Web proxy are [available here](https://github.com/improbable-eng/grpc-web).

Please see the full [gRPC-Web README](https://github.com/improbable-eng/grpc-web) for known limitations.

## Installation

`grpc-web-client` has peer dependencies of `google-protobuf` and `@types/google-protobuf`.

`npm install google-protobuf @types/google-protobuf grpc-web-client --save`

## Example Project

There is an [example project available here](https://github.com/improbable-eng/grpc-web/tree/master/example)

## Usage
* Use [`ts-protoc-gen`](https://www.npmjs.com/package/ts-protoc-gen) with [`protoc`](https://github.com/google/protobuf) to generate `.js` and `.d.ts` files for your request and response classes. `ts-protoc-gen` can also generate gRPC service definitions with the `service=true` argument.
* Make a request:
```ts
import {grpc, Code, Metadata} from "grpc-web-client";

// Import code-generated data structures.
import {BookService} from "./generated/proto/examplecom/library/book_service_pb_service";
import {GetBookRequest, QueryBooksRequest, Book} from "./generated/proto/examplecom/library/book_service_pb";

const queryBooksRequest = new QueryBooksRequest();
queryBooksRequest.setAuthorPrefix("Geor");
grpc.invoke(BookService.QueryBooks, {
  request: queryBooksRequest,
  host: "https://example.com",
  onHeaders: (headers: Metadata) => {
    console.log("got headers: ", headers);
  },
  onMessage: (message: Book) => {
    console.log("got book: ", message.toObject());
  },
  onEnd: (code: grpc.Code, msg: string | undefined, trailers: Metadata) => {
    if code == grpc.Code.OK {
      console.log("all ok");
    } else {
      console.log("hit an error", code, msg, trailers);
    }
  }
});
```

* You can use the `.unary()` convenience function for unary requests and get a single callback:
```ts
const getBookRequest = new GetBookRequest();
getBookRequest.setIsbn(60929871);
grpc.unary(BookService.GetBook, {
  request: getBookRequest,
  host: host,
  onEnd: res => {
    const { status, statusMessage, headers, message, trailers } = res;
    if (status === Code.OK && message) {
      console.log("all ok. got book: ", message.toObject());
    }
  }
});
```
