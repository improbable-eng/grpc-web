#!/usr/bin/env bash
set -e
set -x

cd "$(dirname "$0")"

go build -o ./go/build/testserver ./go/testserver/testserver.go

./go/build/testserver --tls_cert_file=../misc/localhost.crt --tls_key_file=../misc/localhost.key &
