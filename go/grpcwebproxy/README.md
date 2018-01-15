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

To install, you need to have Go >= 1.8, and call `go get`:

```
go get -u github.com/improbable-eng/grpc-web/go/grpcwebproxy
```

## Running

Here's a simple example that fronts a local, TLS gRPC server:

```
$GOPATH/bin/grpcwebproxy
    --server_tls_cert_file=../../misc/localhost.crt \
    --server_tls_key_file=../../misc/localhost.key \
    --backend_addr=localhost:9090 \
    --backend_tls_noverify
```

### Running specific servers

By default, grpcwebproxy will run both TLS and HTTP debug servers. To disable either one, set the `--run_http_server` or `--run_tls_server` flags to false.

For example, to only run the HTTP server, run the following:

```
$GOPATH/bin/grpcwebproxy
    --backend_addr=localhost:9090 \
    --run_tls_server=false
```
