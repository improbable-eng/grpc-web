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
