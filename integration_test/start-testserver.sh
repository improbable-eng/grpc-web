#!/usr/bin/env bash
set -e
set -x

cd "$(dirname "$0")"

if [ -z "$PREBUILT_INTEGRATION_TESTS" ]; then
  echo "Building integration test server"
  go build -o ./go/build/testserver ./go/testserver/testserver.go
else
  echo "Skipping test server build because PREBUILT_INTEGRATION_TESTS is set"
fi

./go/build/testserver --tls_cert_file=../misc/localhost.crt --tls_key_file=../misc/localhost.key &
