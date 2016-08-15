#!/bin/bash
# Generates nodejs datastructures for protobuf.js
#node_modules/protobufjs/bin/pbjs --target commonjs --using convertFieldsToCamelCase --path ../testproto/ ../testproto/test.proto > src/code_gen/test.js

# Need protoc3.0.0
# need npm install grpc-tools and grpc_node_plugin on the $PATH

mkdir -p src/proto
protoc \
   --js_out=import_style=commonjs,binary:src/proto \
   --grpc_out=commonjs,binary:src/proto \
   --plugin=protoc-gen-grpc=node_modules/grpc-tools/bin/grpc_node_plugin \
   -I ../testproto ../testproto/*.proto

protoc \
   --js_out=import_style=commonjs,binary:src/proto \
   --grpc_out=commonjs,binary:src/proto \
   --plugin=protoc-gen-grpc=node_modules/grpc-tools/bin/grpc_node_plugin \
   -I ../testproto ../testproto/nested/*.proto

# Nuke gRPC import
find src/proto -iname '*grpc_pb.js' -exec sed -i '/grpc/d' {} \;
