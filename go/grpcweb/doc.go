// Copyright 2017 Michal Witkowski. All Rights Reserved.
// See LICENSE for licensing terms.

/*
`grpcweb` implements the gRPC-Web spec as a wrapper around a gRPC-Go Server.

It allows web clients (see companion JS library) to talk to gRPC-Go servers over the gRPC-Web spec. It allows for
HTTP/1.1 and HTTP2 encoding of a gRPC stream and supports unary and server-side streaming RPCs. Bi-di and clieant
streams are unsupported due to limitations in browser protocol support.

See https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md.
*/
package grpcweb
