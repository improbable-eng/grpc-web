# grpc.invoke

`grpc.invoke` allows making either a unary or server-streaming gRPC request.

There is also [`grpc.unary`](unary.md) which is a convenience function for making unary requests and [`grpc.client`](client.md) for making bi-directional requests. `grpc.client` will also work with unary and server-streaming methods.

## API Docs:
```javascript
grpc.invoke(methodDescriptor: MethodDescriptor, props: InvokeRpcOptions): Request;
```

`methodDescriptor` is a generated method definition ([see code generation for how to generate these](code-generation.md)).

#### `InvokeRpcOptions`:

* `host: string`
  * The server address (`"https://example.com:9100"`)
* `request: grpc.ProtobufMessage`
  * The single request message to send to the server
* `metadata: grpc.Metadata`
  * The metadata to send to the server
* `onHeaders: (headers: grpc.Metadata) => void)`
  * A callback for headers being received
* `onMessage: (response: grpc.ProtobufMessage) => void)`
  * A callback for messages being received
* `onEnd: (code: grpc.Code, message: string, trailers: grpc.Metadata) => void)`
  * A callback for the end of the request and trailers being received
* `transport?: TransportFactory`
  * (optional) A function to build a `Transport` that will be used for the request. If no transport is specified then a browser-compatible transport will be used. See [transport](transport.md).
* `debug?: boolean`
  * (optional) if `true`, debug information will be printed to the console

#### `Request`:
```javascript
// Close the connection to the server without waiting for any response
close(): void;
```

### Lifecycle
A unary or server-streaming gRPC request goes through the following stages:

* Request with optional metadata and a single message is sent to the server - `invoke()`
* Server sends headers (metadata) - `onHeaders` callback called
* Server responds with one (or more if non-unary) message(s) to the client - `onMessage` callback called
* Server closes the request with [status code](concepts.md#status-codes) and trailers (metadata) - `onEnd` callback called

## Example:
```javascript
const request = new QueryBooksRequest();
request.setAuthorPrefix("Geor");

const grpcRequest = grpc.invoke(BookService.QueryBooks, {
  host: "https://example.com:9100",
  metadata: new grpc.Metadata({"HeaderTestKey1": "ClientValue1"}),
  onHeaders: ((headers: grpc.Metadata) => {
    console.log("onHeaders", headers);
  },
  onMessage: ((message: Book) => {
    console.log("onMessage", message);
  },
  onEnd: ((status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
    console.log("onEnd", status, statusMessage, trailers);
  },
});

grpcRequest.close();// Included as an example of how to close the request, but this usage would cancel the request immediately
```