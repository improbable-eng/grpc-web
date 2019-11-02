# Transports

`@improbable-eng/grpc-web` is a library for JavaScript-based clients to communicate with servers which can talk the `grpc-web` protocol.

To enable this communication, `@improbable-eng/grpc-web` uses Transports provides built-in transports which abstract the underlying browser primitives.

## Specifying Transports
You can tell `@improbable-eng/grpc-web` which Transport to use either on a per-request basis, or by configuring the Default Transport in your application.

### Specifying the Default Transport
The Default Transport is used for every call unless a specific transport has been provided when the call is made. `@improbable-eng/grpc-web` will default to using the `CrossBrowserHttpTransport`, however you can re-configure this:

```typescript
import {grpc} from "@improbable-eng/grpc-web";

// 'myTransport' is configured to send Browser cookies along with cross-origin requests. 
const myTransport = grpc.CrossBrowserHttpTransport({ withCredentials: true });

// Specify the default transport before any requests are made. 
grpc.setDefaultTransport(myTransport);
``` 

### Specifying the Transport on a per-request basis
As mentioned above, `@improbable-eng/grpc-web` will use the Default Transport if none is specified with the call; you can override this behavior by setting the optional `transport` property when calling `unary()`, `invoke()` or `client()`:

```typescript
import {grpc} from "@improbable-eng/grpc-web";

// 'myTransport' is configured to send Browser cookies along with cross-origin requests.
const myTransport = grpc.CrossBrowserHttpTransport({ withCredentials: true });
const client = grpc.client(BookService.QueryBooks, {
  host: "https://example.com:9100",
  transport: myTransport
});
```
 

## Built-in Transports
`@improbable-eng/grpc-web` ships with two categories of Transports: [HTTP/2-based](#http/2-based-transports) and [socket-based](#socket-based-transports):

### HTTP/2-based Transports
It's great that we have more than one choice when it comes to Web Browsers, however the inconsistencies and limited feature-sets can be frustrating. Whilst `@improbable-eng/grpc-web` looks to abstract as much of this as possible with the `CrossBrowserHttpTransport` there are some caveats all application developers who make use of `@improbable-eng/grpc-web`'s HTTP/2 based transports should be aware of:

* gRPC offers four categories of request: unary, server-streaming, client-streaming and bi-directional. Due to limitations of the Browser HTTP primitives (`fetch` and `XMLHttpRequest`), the HTTP/2-based transports provided by `@improbable-eng/grpc-web` can only support unary and server-streaming requests. Attempts to invoke either client-streaming or bi-directional endpoints will result in failure.
* Older versions of Safari (<7) and all versions of Internet Explorer do not provide an efficient way to stream data from a server; this will result in the entire response of a gRPC client-stream being buffered into memory which can cause performance and stability issues for end-users. 
* Microsoft Edge does not propagate the cancellation of requests to the server; which can result in memory/process leaks on your server. Track this issue for status.

Note that the [Socket-based Transports](#socket-based-transports) alleviate the above issues.

#### CrossBrowserHttpTransport
The `CrossBrowserHttpTransport` is a compatibility layer which abstracts the concrete HTTP/2 based Transports described below. This is the preferred Transport if you need to support a wide-range of browsers. As it represents the greatest common divisor of the fetch and xhr-based transports, configuration is limited:

```typescript
interface CrossBrowserHttpTransportInit {
  // send browser cookies along with cross-origin requests (CORS), defaults to `false`.
  withCredentials?: boolean
}
``` 

The `CrossBrowserHttpTransport` will automatically select a concrete HTTP/2 based transport based on the capabilities exposed by the user's browser.

#### FetchReadableStreamTransport
The `FetchReadableStreamTransport` is a concrete HTTP/2 based transport which uses the `fetch` browser primitive; whilst the `fetch` API is now widely available in modern browsers, [support for request ReadableStreams](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/ReadableStream#Browser_compatibility), required for implementing efficient server-streaming, is still inconsistent. This transport allows full configuration of the fetch request mirroring the [`RequestInit` browser API](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request), sans the ability to specify `headers`, `method`, `body` or `signal` properties to avoid conflicts with the gRPC protocol/implementation.

```typescript
interface FetchTransportInit {
  // send browser cookies along with requests, defaults to 'omit'.
  credentials?: 'omit' | 'same-origin' | 'include'
}
```

#### XhrTransport
The `XhrTransport` is a concrete HTTP/2 based transport which uses the `XMLHttpRequest` browser primitive; there is almost never any need to use this transport directly. Configuration is minimal with no ability to set request headers to avoid conflicts with the gRPC protocol/implementation.

```typescript
interface XhrTransportInit {
  // send browser cookies along with cross-origin requests (CORS), defaults to `false`.
  withCredentials?: boolean
}
```

The `XhrTransport` will automatically detect the Firefox Browser v21+ and make use of the `moz-chunked-arraybuffer` feature which provides enables efficient server-streaming. All other browsers will fall-back to buffering the entire response in memory for the lifecycle of the stream (see [known limitations of HTTP/2-based transports](#http/2-based-transports)).

### Socket-based Transports
Browser based HTTP/2 transports have a number of limitations and caveats. We can work around all of these, including support for client-streams and bi-directional streams, by utilising the browser's native [`WebSocket` API](). Note that the `grpc-web-proxy` must be [configured to enable WebSocket support](../../go/grpcwebproxy/README.md#enabling-websocket-transport). 

## Alternative Transports
Custom transports can be created by implementing the `Transport` interface; the following transports exist as npm packages which you can import and make use of:

* [grpc-web-node-http-transport](http://npmjs.com/package/grpc-web-node-http-transport) - Enables the use of grpc-web in NodeJS (ie: non-browser) environments.