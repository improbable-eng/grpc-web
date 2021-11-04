## 0.15.0

### Other changes
* (Optional) Health check [@zolkin](https://github.com/zolkin) in [#1056](https://github.com/improbable-eng/grpc-web/pull/1056)

## 0.14.1

### Other changes

* Replace Dep with Go Modules [@JohanBrandhorst](https://github.com/JohanBrandhorst) in [#911](https://github.com/improbable-eng/grpc-web/pull/911)
* Replace prototool with buf [@JohanBrandhorst](https://github.com/JohanBrandhorst) in [#847](https://github.com/improbable-eng/grpc-web/pull/847)
* Allow websocket read limit to be configured [@bryanmcgrane](https://github.com/bryanmcgrane) in [#1023](https://github.com/improbable-eng/grpc-web/pull/1023)
* Fix /metrics, /debug/requests, /debug/events [@zolkin](https://github.com/zolkin) in [#957](https://github.com/improbable-eng/grpc-web/pull/957)
* Fix websocket cancellation handling [@MarcusLongmuir](https://github.com/MarcusLongmuir) in [#917](https://github.com/improbable-eng/grpc-web/pull/917)

## 0.14.0
### Breaking Changes
* Server: Change websocket lib to nhooyr.io/websocket [@Hellysonrp](https://github.com/Hellysonrp) in [#815](https://github.com/improbable-eng/grpc-web/pull/815)
### Other Changes
* Client & Server: Update TS/JS & Go dependencies [@MarcusLongmuir](https://github.com/MarcusLongmuir) in [#841](https://github.com/improbable-eng/grpc-web/pull/841)
* Client: Fixed fetch abort behaviour for Edge 16+ [@MarcusLongmuir](https://github.com/MarcusLongmuir) in [#819](https://github.com/improbable-eng/grpc-web/pull/819)
* Server: Check flusher before flush [@kostyay](https://github.com/@kostyay) in [#817](https://github.com/improbable-eng/grpc-web/pull/817)
* Server: Websockets test should use case-insensitive header compare [@mgkeeley](https://github.com/@mgkeeley) in [#760](https://github.com/improbable-eng/grpc-web/pull/760)

## 0.13.0
### Breaking Changes
* Client: No longer invoking callbacks within timeouts - this may affect the temporal ordering of some usage. [@marcuslongmuir](https://github.com/marcuslongmuir) in [#576](https://github.com/improbable-eng/grpc-web/pull/576)
### Other Changes
* Server: grpcwebproxy uses `backend_max_call_recv_msg_size` flag value for client call to backend (in addition to its usage as its own receive limit). [@itwalton](https://github.com/itwalton) in [#654](https://github.com/improbable-eng/grpc-web/pull/654)

## 0.12.0
### Other Changes
* Server: Add option to enabled websocket keepalive pinging. [@angwangiot](https://github.com/angwangiot) in [#546](https://github.com/improbable-eng/grpc-web/pull/546)
* Server: Support header whitelist in websocket transport. [@alexvas](https://github.com/alexvas) in [#558](https://github.com/improbable-eng/grpc-web/pull/558)
* Server: Check that there aren't any unknown command line arguments. [@Timmmm](https://github.com/Timmmm) in [#577](https://github.com/improbable-eng/grpc-web/pull/577)
* Server: Remove connection header from grpcwebproxy. [@crlssn](https://github.com/crlssn) in [#588](https://github.com/improbable-eng/grpc-web/pull/588)
* Client: React Native support - Adds and exposes ReactNativeTransport. [@pbsf](https://github.com/pbsf) in [#458](https://github.com/improbable-eng/grpc-web/pull/458)
* Client: node-http-transport fix deprecation. [@the729](https://github.com/the729) in [#595](https://github.com/improbable-eng/grpc-web/pull/595)
* Server: Add "WrapHandler" function and "WithEndpointsFunc" option. [@yinzara](https://github.com/yinzara) in [#619](https://github.com/improbable-eng/grpc-web/pull/619)

## 0.11.0
### Breaking changes
* Server: Revert changes to flusher interface which accidentally introduced a recursive call to `Flush()`. [@johanbrandhorst](https://github.com/johanbrandhorst) in [#527](https://github.com/improbable-eng/grpc-web/pull/527)

## 0.10.0
### Breaking Changes
* Server: Check flusher interface before calling Flush. [@mangas](https://github.com/mangas) in [#479](https://github.com/improbable-eng/grpc-web/pull/479)
* Server: Remove `CloseNotify`. [@mangas](https://github.com/mangas) in [#478](https://github.com/improbable-eng/grpc-web/pull/478)
* Client: Set Content-Length header in NodeHTTPTransport to disable chunked encoding. [@MichaelAquilina](https://github.com/MichaelAquilina) in [#427](https://github.com/improbable-eng/grpc-web/pull/427)
* Server: Update grpc-go, golang/protobuf dependencies. [@johanbrandhorst](https://github.com/johanbrandhorst) in [#395](https://github.com/improbable-eng/grpc-web/pull/395)

### Other Changes
* Server: Add `grpc-status` & `grpc-message` as exposed headers. [@Globegitter](https://github.com/Globegitter) in [#489](https://github.com/improbable-eng/grpc-web/pull/489)

## 0.9.6
### Other Changes
* Server: Allow non root resources. [@mangas](https://github.com/mangas) in [#454](https://github.com/improbable-eng/grpc-web/pull/454)
* Client: Fix aborting requests from within a web-worker context. [@midan888](https://github.com/midan888) in [#443](https://github.com/improbable-eng/grpc-web/pull/443)

## 0.9.4
### Other Changes
* Client: Fix broken v0.9.3 release (client binaries were not rebuilt prior to npm publish)

## 0.9.3 (broken)
### Other Changes
* Client: Added grpc-web-fake-transport package.
* Client: Fix global definition in grpc-web UMD build which prevented it from working from within a WebWorker context. [@midan888](https://github.com/midan888) in [#411](https://github.com/improbable-eng/grpc-web/pull/411)

## 0.9.2
### Other Changes
* Server: Remove `content-length` response header. [@LeonSha](https://github.com/LeonSha) in [#385](https://github.com/improbable-eng/grpc-web/pull/385)
* Server: Don't block on writing to the close notify channel. [@devnev](https://github.com/devnev) in [#403](https://github.com/improbable-eng/grpc-web/pull/403)
* Documentation: Remove reference to specific release version in grpcwebproxy README. [@l4u](https://github.com/l4u) in [#370](https://github.com/improbable-eng/grpc-web/pull/370)
* Documentation: Fix up problems present in the `grpc-web-react-example` project. [@atecce](https://github.com/atecce) in [#360](https://github.com/improbable-eng/grpc-web/pull/360)
* Documentation: Updated the installation instructions of grpcwebproxy. [@enmasse](https://github.com/enmasse) in [#399](https://github.com/improbable-eng/grpc-web/pull/399)

## 0.9.1
### Other Changes
* Server: Ensure headers from wrapped server are forwarded appropriately. [@danilvpetrov](https://github.com/danilvpetrov) in [#359](https://github.com/improbable-eng/grpc-web/pull/359)

## 0.9.0
### Breaking Changes
* Server: Deny CORS Requests by Default. [@jonny-improbable](https://github.com/jonny-improbable) in [#158](https://github.com/improbable-eng/grpc-web/pull/158)
  * By default both the grpcweb in-process proxy and the standalone grpcwebproxy binary will deny any requests that come from (sub)domains that differ from that which the server is hosted on. See related docs for the in-process proxy [here](https://github.com/improbable-eng/grpc-web/tree/0ce3b686ebd74ae0e4b494d0f983328eb7a900e6/go/grpcweb#func--withwebsocketoriginfunc) and for the standalone grpcwebproxy [here](https://github.com/improbable-eng/grpc-web/tree/0ce3b686ebd74ae0e4b494d0f983328eb7a900e6/go/grpcwebproxy#configuring-cors-for-http-and-websocket-connections).

### Other Changes
* Server: Support client certs for backend connections. [@[mastersingh24](/https://github.com/mastersingh24)] in [#333](https://github.com/improbable-eng/grpc-web/pull/333)

## 0.8.0
### Breaking Changes
* Scoped npm package under the @improbable-eng org; consumers should now `npm install @improbable-eng/grpc-web`.

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
