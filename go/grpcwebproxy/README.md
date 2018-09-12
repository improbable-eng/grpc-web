# gRPC Web Proxy

This is a small reverse proxy that can front existing gRPC servers and expose their functionality using gRPC-Web
protocol, allowing for the gRPC services to be consumed from browsers.

Features:
 * structured logging of proxied requests to stdout
 * debug HTTP endpoint (default on port `8080`)
 * Prometheus monitoring of proxied requests (`/metrics` on debug endpoint)
 * Request (`/debug/requests`) and connection tracing endpoints (`/debug/events`)
 * TLS 1.2 serving (default on port `8443`):
   * with option to enable client side certificate validation
 * both secure (plaintext) and TLS gRPC backend connectivity:
   * with customizable CA certificates for connections

The indented use is as a companion process for gRPC server containers.

## Installing

### Pre-build binaries

There are pre-build binaries available for Windows, Mac and Linux (x86_64):
https://github.com/improbable-eng/grpc-web/releases/tag/0.6.3

### Building from source

To build, you need to have Go >= 1.8, and call `go get` with `dep ensure`:

```sh
git clone github.com/improbable-eng/grpc-web $GOPATH/src/
cd $GOPATH/src/github.com/improbable-eng/grpc-web
dep ensure # after installing dep
go install ./go/grpcwebproxy # installs into $GOPATH/bin/grpcwebproxy
```

## Running

Here's a simple example that fronts a local, TLS gRPC server:

```sh
grpcwebproxy
    --server_tls_cert_file=../../misc/localhost.crt \
    --server_tls_key_file=../../misc/localhost.key \
    --backend_addr=localhost:9090 \
    --backend_tls_noverify
```

### Running specific servers

By default, grpcwebproxy will run both TLS and HTTP debug servers. To disable either one, set the `--run_http_server` or `--run_tls_server` flags to false.

For example, to only run the HTTP server, run the following:

```sh
grpcwebproxy
    --backend_addr=localhost:9090 \
    --run_tls_server=false
```

### Enabling Websocket Transport

By default, grpcwebproxy will not use websockets as a transport layer. To enable websockets, set the `--use_websockets` flag to true.

```
$GOPATH/bin/grpcwebproxy \
    --backend_addr=localhost:9090 \
    --use_websockets
```
