# grpc.client

`grpc.client` allows making any type of gRPC request and exposes a client for the request that can be used to send multiple messages and attach callbacks to the request's lifecycle.

**The default transports are not capable of bi-directional streaming - this implementation exists to support future transports such as websockets that are capable of bi-directional streaming.**

## API Docs:
```javascript
grpc.client(methodDescriptor: MethodDescriptor, props: ClientRpcOptions): Client;
```

`methodDescriptor` is a generated method definition ([see code generation for how to generate these](code-generation.md)).

#### `ClientRpcOptions`:

* `host: string`
  * The server address (`"https://example.com:9100"`)
* `transport?: TransportFactory`
  * (optional) A function to build a `Transport` that will be used for the request. If no transport is specified then a browser-compatible transport will be used. See [transport](transport.md).
* `debug?: boolean`
  * (optional) if `true`, debug information will be printed to the console

#### `Client`:
```javascript
// Open the connection to the server
start(metadata?: grpc.Metadata): void;

// Send a single instance of the request message type
send(message: grpc.ProtobufMessage): void;

// Indicate to the server that the client has finished sending
finishSend(): void;

// Close the connection to the server without waiting for any response
close(): void;

// Attach a callback for headers being received
onHeaders(callback: (headers: grpc.Metadata) => void): void;

// Attach a callback for messages being received
onMessage(callback: (response: grpc.ProtobufMessage) => void): void;

// Attach a callback for the end of the request and trailers being received
onEnd(callback: (code: grpc.Code, message: string, trailers: grpc.Metadata) => void): void;
```

### Lifecycle
A gRPC request goes through the following stages:

* Request is opened with optional metadata - `start()`
* Client sends one (or more if non-unary) message(s) to the server - `send()`
* Client optionally indicates that it has finished sending - `finishSend()`
* Server sends headers (metadata) - `onHeaders()`
* Server responds with one (or more if non-unary) message(s) to the client - `onMessage()`
* Server closes the request with status code and trailers (metadata) - `onEnd()`

### Transport Limitations

Sending multiple messages and indicating that the client has finished sending are complicated by the nature of some of the transports used by `@improbable-eng/grpc-web`.

Most browser networking methods do not allow control over the sending of the body of the request, meaning that sending a single request message forces the finishing of sending, limiting these transports to unary or server-streaming methods only.

For transports that do allow control over the sending of the body (e.g. websockets), the client can optionally indicate that it has finished sending. This is useful for client-streaming or bi-directional methods in which the server will send responses after receiving all client messages. Usage with unary methods is likely not necessary as server handlers will assume the client has finished sending after receiving the single expected message.

## Example:
```javascript
const request = new QueryBooksRequest();
request.setAuthorPrefix("Geor");

const client = grpc.client(BookService.QueryBooks, {
  host: "https://example.com:9100",
});
client.onHeaders((headers: grpc.Metadata) => {
  console.log("onHeaders", headers);
});
client.onMessage((message: Book) => {
  console.log("onMessage", message);
});
client.onEnd((status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
  console.log("onEnd", status, statusMessage, trailers);
});

client.start(new grpc.Metadata({"HeaderTestKey1": "ClientValue1"}));
client.send(request);
client.finishSend(); // included for completeness, but likely unnecessary as the request is unary
```