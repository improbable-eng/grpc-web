# gRPC-Web-Example: A simple Golang API server and TypeScript frontend

### Get started (with HTTP 1.1)

* `npm install`
* `npm run get_go_deps` to install Golang dependencies
* `npm start` to start the Golang server and Webpack dev server
* Go to `http://localhost:8081`


### Using HTTP2

HTTP2 requires TLS. This repository contains certificates in the `misc` directory. You can optionally generate your own replacements using the `gen_cert.sh` in the same directory.

Follow [this guide](http://stackoverflow.com/questions/7580508/getting-chrome-to-accept-self-signed-localhost-certificate) to accept the certificates in Chrome.

* `npm run start:tls` to start the Golang server and Webpack dev server with the certificates in `misc`
* Go to `https://localhost:8082`