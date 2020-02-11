# Code Generation

To make gRPC requests the client requires generated code for the [method definitions](concepts.md#method-definition) and message classes that are [defined in `.proto` files](https://developers.google.com/protocol-buffers/docs/proto3#services).

[`protoc`](https://github.com/google/protobuf) is the google protobuf code generation tool. It can generate the JavaScript message classes and also supports using plugins for additional code generation.

[`ts-protoc-gen`](https://www.github.com/improbable-eng/ts-protoc-gen) is a package that can generate the `.d.ts` files that declare the contents of the protoc-generated JavaScript files. `ts-protoc-gen` can also generate `@improbable-eng/grpc-web` client service/method definitions with the `protoc-gen-ts` plugin and `service=true` argument.

This is an example of a complete invokation of `protoc` with `ts-protoc-gen` assuming your `.proto` files are in a directory named `my-protos` within the current working directory:

```bash
protoc \
--plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
--js_out=import_style=commonjs,binary:my-generated-code \
--ts_out=service=grpc-web:my-generated-code \
-I ./my-protos \
my-protos/*.proto
```

A proto file such as `book_service.proto`:

```protobuf
syntax = "proto3";

package examplecom.library;

message Book {
 int64 isbn = 1;
 string title = 2;
 string author = 3;
}

message GetBookRequest {
 int64 isbn = 1;
}

service BookService {
 rpc GetBook(GetBookRequest) returns (Book) {}
}
```

Will generate `book_service_pb.js`, `book_service_pb.d.ts`, `book_service_pb_service.js` and `book_service_pb_service.d.ts`

The first two files contain the message classes while the lst two contain a `BookService.GetBook` class that acts as [method definition](concepts.md#method-definition) that can be used with `@improbable-eng/grpc-web`.
