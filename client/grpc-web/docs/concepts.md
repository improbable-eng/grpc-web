# Concepts

It is assumed that you are familiar with the gRPC concepts found here: https://grpc.io/docs/guides/concepts.html

This page describes various concepts referred to within the gRPC-Web documentation.

### Method Definition
A method definition includes the service and method names, request and response types and whether the method is client-streaming and/or server-streaming.

Definitions of the format used by `@improbable-eng/grpc-web` can be generated using the [`ts-protoc-gen`](https://github.com/improbable-eng/ts-protoc-gen) plugin for [protoc](https://github.com/google/protobuf). See [code generation](code-generation) for instructions.

#### Example method definition:
```javascript
export namespace BookService {
  export class GetBook {
    static readonly methodName = "GetBook";
    static readonly service = BookService;
    static readonly requestStream = false;
    static readonly responseStream = false;
    static readonly requestType = GetBookRequest;
    static readonly responseType = Book;
  }
}
```

### Metadata
Metadata is a collection of key-value pairs sent by the client to the server and then from the server to the client both before the response (headers) and after the response (trailers). One use case for metadata is for sending authentication tokens from a client.

`@improbable-eng/grpc-web` uses the [`js-browser-headers`](https://github.com/improbable-eng/js-browser-headers) library to provide a consistent implementation of the Headers class across browsers. The `BrowserHeaders` class from this library is aliased to `grpc.Metadata`.

### Status Codes
Upon completion a gRPC request will expose a status code indicating how the request ended. This status code can be provided by the server in the [Metadata](#metadata), but if the request failed or the server did not include a status code then the status code is determined by the client.

`0 - OK` indicates that the request was completed successfully.

#### `grpc.Code`:
```javascript
0   OK
1   Canceled
2   Unknown
3   InvalidArgument
4   DeadlineExceeded
5   NotFound
6   AlreadyExists
7   PermissionDenied
8   ResourceExhausted
9   FailedPrecondition
10  Aborted
11  OutOfRange
12  Unimplemented
13  Internal
14  Unavailable
15  DataLoss
16  Unauthenticated
```

### Status Messages
Alongside a status code, requests can include a message upon completion. This can be provided by the server in the [Metadata](#metadata), but if the request failed or the server did not include a status message then the status message is determined by the client and is intended to aid debugging.

