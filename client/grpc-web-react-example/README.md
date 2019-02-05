# gRPC-Web-Example: A simple Golang API server and TypeScript frontend

### Get started (with HTTP 1.1)

* `npm install`
  * The postinstall will run `npm run get_go_deps` to install Golang dependencies. [dep](https://github.com/golang/dep) is used for go dependency management.
* `npm start` to start the Golang server and Webpack dev server
* Go to `http://localhost:8081`


### Using HTTP2

HTTP2 requires TLS. This repository contains certificates in the `../misc` directory which are used by the server. You can optionally generate your own replacements using the `gen_cert.sh` in the same directory.
You will need to import the `../misc/localhostCA.pem` certificate authority into your browser, checking the "Trust this CA to identify websites" so that your browser trusts the localhost server.

* `npm run start:tls` to start the Golang server and Webpack dev server with the certificates in `misc`
* Go to `https://localhost:8082`
