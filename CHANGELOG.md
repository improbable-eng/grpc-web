## 0.7.0
### Breaking Changes
* Removed built-in support for NodeJS Environments; if you want to use `grpc-web-client` in a NodeJS environment you will need to import `grpc-web-node-http-transport` and specify it as your Default Transport.
* The `transport` property passed to `unary()`, `invoke()` and `client()` should now be an instance of the `Transport` interface (was a reference to a factory function which returned a `Transport` instance), see [#265](https://github.com/improbable-eng/grpc-web/pull/265) for details.

### Other Changes
* Client: Added `grpc.setDefaultTransport()` which can be used to specify which Transport is used when none is specified with the request. [@jonny-improbable](https://github.com/jonny-improbable) in [#265](https://github.com/improbable-eng/grpc-web/pull/265)
* Client: Allowed for configuration of XHR and Fetch-based transports and exposed them via the `grpc` namespace. [@jonny-improbable](https://github.com/jonny-improbable) in [#265](https://github.com/improbable-eng/grpc-web/pull/265)
* Client: Don't call callbacks if close() is called. [@virtuald](https://github.com/virtuald) in [#258](https://github.com/improbable-eng/grpc-web/pull/258)
* Client: Export `grpc-web-client` as a UMD Module. [@Dig-Doug](https://github.com/Dig-Doug) in [#276](https://github.com/improbable-eng/grpc-web/pull/276)
* Server: Fix gRPC Web spec violation related to header/trailer names. [@ktr0731](https://github.com/ktr0731) in [#271](https://github.com/improbable-eng/grpc-web/pull/271)
* Server: Add backend_backoff_max_delay flag to grpcwebproxy. [@fordhurley](https://github.com/fordhurley) in [#278](https://github.com/improbable-eng/grpc-web/pull/278)
* Server: Add support for specifying a default :authority header for backend calls. [@sandersaares](https://github.com/sandersaares) in [#267](https://github.com/improbable-eng/grpc-web/pull/267)
* Server: Prevent leaking goroutines from websocket connections. [@amerry](https://github.com/amerry) in [#253](https://github.com/improbable-eng/grpc-web/pull/253)
* Server: Add option to increase max message size. [@nevi-me](https://github.com/nevi-me) in [#246](https://github.com/improbable-eng/grpc-web/pull/246)
* Server: Switched to assign CAs to correct config property. [@jonahbron](https://github.com/jonahbron) in [#244](https://github.com/improbable-eng/grpc-web/pull/244)

## 0.6.3
* Fix callbacks being invoked after cancellation [@mwei0210](https://github.com/mwei0210) in [#207](https://github.com/improbable-eng/grpc-web/pull/207)
* Fix unhandled promise rejection upon errors in fetch transport [@Runar1](https://github.com/Runar1) in [#189](https://github.com/improbable-eng/grpc-web/pull/189)
* Fix bug in gprcwebproxy's WebSocket Transport support [@bianbian-org](https://github.com/bianbian-org) in [#211](https://github.com/improbable-eng/grpc-web/pull/211)
* Fix headers/trailers being lost when grpc-status is non-zero [@gunn4r](https://github.com/gunn4r) in [#226](https://github.com/improbable-eng/grpc-web/pull/226)

## 0.6.2
* Add support for WebSocket Transport in grpcwebproxy [@JCGrant](https://github.com/JCGrant) in [#180](https://github.com/improbable-eng/grpc-web/pull/180)

## 0.6.1
* Fix gRPC message decoding [@ishitatsuyuki](https://github.com/ishitatsuyuki) in [#117](https://github.com/improbable-eng/grpc-web/pull/117)
* Update the localhost certificate generation to create certs from a local certificate authority. [@absoludity](https://github.com/absoludity) in [#169](https://github.com/improbable-eng/grpc-web/pull/169)
* Fix memory leak in fetch transport [@nathanb21](https://github.com/nathanb21) in [#184](https://github.com/improbable-eng/grpc-web/pull/184)
* Add abort signal support in fetch transport [@Runar1](https://github.com/Runar1) in [#173](https://github.com/improbable-eng/grpc-web/pull/173)


## 0.6.0
* Fix stream terminated by RST_STREAM [@MrWinstead](https://github.com/MrWinstead) in [#148](https://github.com/improbable-eng/grpc-web/pull/148)
* Make gRPC status codes consistent with gRPC-Go [@johanbrandhorst](https://github.com/johanbrandhorst) in [#150](https://github.com/improbable-eng/grpc-web/pull/150)
* React usage examples added [@easyCZ](https://github.com/easyCZ) in [#133](https://github.com/improbable-eng/grpc-web/pull/133)
* Added experimental WebSocket transport [@MarcusLongmuir](https://github.com/MarcusLongmuir) in [#132](https://github.com/improbable-eng/grpc-web/pull/137)

## 0.5.0
* Refactored client interface to provide a stronger abstraction for alternative Transports (ie: WebSockets) [@MarcusLongmuir](https://github.com/MarcusLongmuir) in [#132](https://github.com/improbable-eng/grpc-web/pull/132)
* Everything is now exported under a single namespace (`grpc`).
