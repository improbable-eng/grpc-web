#!/bin/bash

mkdir -p ./ts/_proto
mkdir -p ./go/_proto

PROTOC=`command -v protoc`
if [[ "$PROTOC" == "" ]]; then
  echo "Required "protoc" to be installed. Please visit https://github.com/protocolbuffers/protobuf/releases (>=3.5.0 suggested)."
  exit -1
fi

echo "Compiling protobuf definitions"
protoc \
  --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
  --plugin=protoc-gen-go=$(go env GOPATH)/bin/protoc-gen-go \
  -I ./proto \
  --js_out=import_style=commonjs,binary:./ts/_proto \
  --go_out=plugins=grpc:./go/_proto \
  --ts_out=service=true:./ts/_proto \
  ./proto/examplecom/library/book_service.proto
