# Client-side streaming over websocket

Due to the [limitations](./transport.md#http2-based-transports) of HTTP/2 based transports in browsers, they cannot support client-side/bi-directional streaming. `@improbable-eng/grpc-web` provides a built-in [websocket](./transport.md#socket-based-transports) transport that alleviates this issue.

## Enabling at the client side

To enable websocket communication at the client side, `WebsocketTransport` needs to be configured. See [this](./transport.md#specifying-transports) on how to configure a transport in your application.

## Enabling at the server side

### grpcwebproxy

If you're using `grpcwebproxy` to front your gRPC server, see [this](../../../go/grpcwebproxy/README.md#enabling-websocket-transport).

### grpcweb

If you're using `grpcweb` module as a wrapper around your gRPC-Go server, see [this](../../../go/grpcweb#func--withwebsockets).
