#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
PROTOBUF_DIR=${PROTOBUF_DIR-${SCRIPT_DIR}/proto}
PROTOGEN_DIR=generated/_proto
GENERATION_DIR=${GENERATION_DIR-${SCRIPT_DIR}/${PROTOGEN_DIR}}

mkdir -p ${GENERATION_DIR} 2> /dev/null
PROTO_SOURCES=$(npx glob-cli2 './proto/**/*.proto')

protoc \
    --plugin=protoc-gen-improbable-grpc-web=./bin/protoc-gen-improbable-grpc-web \
    --js_out=import_style=commonjs,binary:${GENERATION_DIR} \
    --improbable-grpc-web_out=service=true:${GENERATION_DIR} \
    ${PROTO_SOURCES}
