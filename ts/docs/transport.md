# Transport

As `grpc-web-client` is an implementation of a binary protocol (gRPC) in browsers that have various methods of performing HTTP requests with varying implementations across vendors limitations there are multiple underlying transports that are used to provide support across browsers. 

A “transport” in this context is a wrapper of one of these methods of creating a HTTP request (e.g. `fetch` or `XMLHttpRequest`).

## How does grpc-web-client pick a transport?

You can specify the transport that you want to use for a specific invocation through the `library` property in the [`client`](client.md), [`invoke`](invoke.md) and [`unary`](unary.md) function options.

If a transport is not specified then a transport factory is used to determine the browser’s compatible transports. See [Available Transports](#available-transports)

If none are found then an exception is thrown.

### Available transports 

In order of attempted usage.

#### Fetch
Uses [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch). Requires that the browser supports [Fetch with `body.getReader`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream).

Supports binary request and response bodies and allows streaming the response without buffering it entirely, thereby safely enabling long-lived server streams.

Supported by:

* Chrome 43+
* Edge 13+
* Safari 10.1+

#### XMLHttpRequest (with `moz-chunked-arraybuffer`) (only available in Firefox)
Uses [XmlHttpRequest (XHR)](https://developer.mozilla.org/en/docs/Web/API/XMLHttpRequest) with `responseType = "moz-chunked-arraybuffer"` to enable reading the response stream chunks as binary as they arrive, rather than buffering the entire response as the standard XMLHttpRequest transport does, thereby safely enabling long-lived server streams.

Supported by:

* Firefox 21+

#### XMLHttpRequest
Uses [XmlHttpRequest (XHR)](https://developer.mozilla.org/en/docs/Web/API/XMLHttpRequest) with `overrideMimeType("text/plain; charset=x-user-defined")`. `overrideMimeType` allows reading the string response as individual bytes as the response arrives.

Supported by:

* Safari 6
* IE 11

**This transport is not safe for long-lived or otherwise large response streams as the entire server response is maintained in memory until the request completes.**

#### Node HTTP (only available in a Node.js environment)
Uses [http](https://nodejs.org/api/http.html)/[https](https://nodejs.org/api/https.html). This transport exists to allow usage of the `grpc-web-client` library in Node.js environments such as Electron or for server-side rendering.

Supported by:

* Node.js only