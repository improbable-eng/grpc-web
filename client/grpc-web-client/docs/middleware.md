# grpc.Middleware & grpc.MiddlewareConstructor
The grpc-client allows you to define a middleware for each client. The middleware is designed to allow you to observe the lifecycle of a request. A common use-case for a middleware is to log the state and duration request without affecting the request in any way.

In order to make this possible, the following interfaces, with full typing support, are provided to help you construct a middleware:
* `grpc.MiddlewareConstructor` - used to construct a request specific middleware. The `grpc.MiddlewareConstructor` must return a partial, or complete, implentation of the `grpc.Middleware` interface.
* `grpc.Middleware` - the concrete set of methods which will be invoked during the lifecycle of a request.

On a high level, the middleware can be used as follows:
```javascript
grpc.unary(BookService.GetBook, {
  ...
  // Middleware is optional. It allows you to take side effects when various request callbacks are triggered.
  middleware: (descriptor, props) => {
    console.log("middleware: request created", descriptor, props);

    return {
      onStart: metadata => console.log("middleware: request started", metadata),
      onSend: (message: ProtobufMessage) => console.log("middleware: onSend", message.toObject()),
      onFinishSend: () => console.log("middleware: onFinishSend"),
      onClose: () => console.log("middleware: onClose"),
      onHeaders: (headers: Metadata) => console.log("middleware: onHeaders", headers),
      onMessage: (message: ProtobufMessage) => console.log("middleware: onMessage", message.toObject()),
      onEnd: (status, statusMessage, trailers) => console.log("middleware: onEnd", status, statusMessage, trailers)
    }
  }
  ...
})
```

## API Docs:
### grpc.MiddlewareConstructor
```javascript
interface MiddlewareConstructor<TypeOfRequest, TypeOfResponse, MethodDescriptor> {
  (descriptor: MethodDescriptor, props: ClientRpcOptions): Partial<Middleware<TypeOfRequest, TypeOfResponse>>
}
```
The interfaces defines a function used to construct a middleware. It mirrors the relevant signature for request invocation [(grpc.invoke)](./invoke.md)

The interface allows for a partial, or complete, implementation of the `grpc.Middleware` interface to be returned by the constructor.

A separate constructor for the middleware is needed to allow lifecycle methods of the request to be scoped to an intance of the middleware rather than be global, requiring unique references to join individual lifecycle invocations together.


## Example:
```javascript
const middlewareConstructor: grpc.MiddlewareConstructor<GetBookRequest, Book> = (descriptor, props) => {
  return new ExampleMiddleware(descriptor, props);
};
````

### grpc.Middleware
```javascript
// Middleware is the canonical definition of a Middleware.
export interface Middleware<
  TRequest extends ProtobufMessage,
  TResponse extends ProtobufMessage,
> {
  // onStart is invoked immediately before a request is initiated.
  // onStart can modify the provided metadata object to attach additional headers.
  onStart(metadata: Metadata): undefined;

  // onSend is invoked immediately before a new message is send to the server
  // from the client.
  // onSend is invoked each time a message is sent to the server.
  onSend(message: TRequest): undefined;

  // onFinishSend is invoked immediately after onFinishSend is invoked on a request.
  // onFinishSend is invoked at most once per request.
  onFinishSend(): undefined;

  // onHeaders is invoked immediately before onHeaders callback is triggered.
  // onHeaders is only invoked once per request.
  onHeaders(headers: Metadata): undefined;

  // onMessage is invoked immediately before onMessage callback is triggered.
  // onMessage is invoked once for each message received from the response.
  onMessage(response: TResponse): undefined;

  // onEnd is invoked immediately after the onEnd callback is triggered.
  // onEnd is invoked once per request.
  onEnd(status: Code, statusMessage: string, trailers: Metadata): undefined;

  // onClose is invoked immediately after onClose is triggered on a request.
  // onClose is invoked at most once per request.
  onClose(): undefined;
}
```
The above defines the interface for a middleware. Each request has at most one instance of a middleware.

A partial implementation is supported. Any un-implemented methods will not affect the request or response in any way.

## Example:
```javascript
const middleware = {
  onStart: metadata => console.log("middleware: request started", metadata),
  onSend: (message: ProtobufMessage) => console.log("middleware: onSend", message.toObject()),
  onFinishSend: () => console.log("middleware: onFinishSend"),
  onClose: () => console.log("middleware: onClose"),
  onHeaders: (headers: Metadata) => console.log("middleware: onHeaders", headers),
  onMessage: (message: ProtobufMessage) => console.log("middleware: onMessage", message.toObject()),
  onEnd: (status, statusMessage, trailers) => console.log("middleware: onEnd", status, statusMessage, trailers)
}
````
