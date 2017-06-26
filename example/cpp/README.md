# gRPC-Web-Example: A simple Golang API server and TypeScript frontend

### Prerequisites

* Install CMake: http://cmake.org
* Install gRPC for C++: http://www.grpc.io/docs/quickstart/cpp.html#install-grpc
* Install Protobuf for C++: http://www.grpc.io/docs/quickstart/cpp.html#install-protocol-buffers-v3

### Get started (with HTTP 1.1)

* `npm install`
* `npm run build:cpp` to build the cpp server
* `go get -u github.com/improbable-eng/grpc-web/go/grpcwebproxy` to get gRPC-Web proxy
* `npm run start:proxy` to start the cpp server, the Webpack dev server and the proxy
* Go to `http://localhost:8081`


### Using HTTP2

HTTP2 requires TLS. This repository contains certificates in the `misc` directory. You can optionally generate your own replacements using the `gen_cert.sh` in the same directory.

Follow [this guide](http://stackoverflow.com/questions/7580508/getting-chrome-to-accept-self-signed-localhost-certificate) to accept the certificates in Chrome.

* `npm run start:proxy:tls` to start the Golang server and Webpack dev server with the certificates in `misc`
* Go to `https://localhost:8082`
