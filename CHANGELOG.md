## 0.6.0
* Fix stream terminated by RST_STREAM [@MrWinstead](https://github.com/MrWinstead) in [#148](https://github.com/improbable-eng/grpc-web/pull/148)
* Make gRPC status codes consistent with gRPC-Go [@johanbrandhorst](https://github.com/johanbrandhorst) in [#150](https://github.com/improbable-eng/grpc-web/pull/150)
* React usage examples added [@easyCZ](https://github.com/easyCZ) in [#133](https://github.com/improbable-eng/grpc-web/pull/133)
* Added experimental WebSocket transport [@MarcusLongmuir](https://github.com/MarcusLongmuir) in [#132](https://github.com/improbable-eng/grpc-web/pull/137)

## 0.5.0
* Refactored client interface to provide a stronger abstraction for alternative Transports (ie: WebSockets) [@MarcusLongmuir](https://github.com/MarcusLongmuir) in [#132](https://github.com/improbable-eng/grpc-web/pull/132)
* Everything is now exported under a single namespace (`grpc`).
