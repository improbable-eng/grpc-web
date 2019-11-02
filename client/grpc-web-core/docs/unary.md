# grpc.unary

`grpc.unary` allows making unary gRPC requests.

There is also [`grpc.invoke`](invoke.md) for making server-streaming requests and [`grpc.client`](client.md) for making bi-directional requests that will both work with unary methods.

## API Docs:
```javascript
grpc.unary(methodDescriptor: MethodDescriptor, props: UnaryRpcOptions): Request;
```

`methodDescriptor` is a generated method definition ([see code generation for how to generate these](code-generation.md)).

#### `UnaryRpcOptions`:

* `host: string`
  * The server address (`"https://example.com:9100"`)
* `request: grpc.ProtobufMessage`
  * The single request message to send to the server
* `metadata: grpc.Metadata`
  * The metadata to send to the server
* `onEnd: (output: UnaryOutput<TResponse>) => void)`
  * A callback for the end of the request and trailers being received
* `transport?: TransportFactory`
  * (optional) A function to build a `Transport` that will be used for the request. If no transport is specified then a browser-compatible transport will be used. See [transport](transport.md).
* `debug?: boolean`
  * (optional) if `true`, debug information will be printed to the console

#### `UnaryOutput`

* `status: Code`
  * The [status code](concepts.md#status-codes) that the request ended with
* `statusMessage: string`
  * The [status message](concepts.md#status-messages) that the request ended with
* `headers: Metadata`
  * The headers ([Metadata](concepts.md#metadata)) that the server sent
* `message: TResponse | null`
  * The single message that the server sent in the response.
* `trailers: Metadata`
  * The trailers ([Metadata](concepts.md#metadata)) that the server sent

#### `Request`:
```javascript
// Close the connection to the server without waiting for any response
close(): void;
```

### Lifecycle
A unary gRPC request goes through the following stages:

* Request with optional metadata and a single message is sent to the server - `unary()`
* Server sends headers (metadata)
* Server responds with one message to the client
* Server closes the request with status code and trailers (metadata) - `onEnd` callback called with the message and metadata that was received

## Example:
```javascript
const request = new QueryBooksRequest();
request.setAuthorPrefix("Geor");

const grpcRequest = grpc.unary(BookService.QueryBooks, {
  host: "https://example.com:9100",
  metadata: new grpc.Metadata({"HeaderTestKey1": "ClientValue1"}),
  onEnd: ({status, statusMessage, headers, message, trailers: string, trailers: grpc.Metadata}) => {
    console.log("onEnd", status, statusMessage, headers, message, trailers);
  },
  request,
});

grpcRequest.close();// Included as an example of how to close the request, but this usage would cancel the request immediately
```
