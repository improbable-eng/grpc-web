# gRPC-Web-Example: A simple Golang API server and TypeScript frontend

### Get started (with HTTP 1.1)

* `npm install`
  * The postinstall will run `npm run get_go_deps` to install Golang dependencies. [dep](https://github.com/golang/dep) is used for go dependency management.
* `npm start` to start the Golang server and Webpack dev server
* Go to `http://localhost:8081`


### Using HTTP2

HTTP2 requires TLS. See `Setup TLS` section of [Contributing](../../CONTRIBUTING.md) readme.

* `npm run start:tls` to start the Golang server and Webpack dev server with the certificates in `keypairs`
* Go to `https://localhost:8082`
