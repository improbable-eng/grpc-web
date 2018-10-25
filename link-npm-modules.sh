#!/bin/bash
set -e

# Link the modules present in this repo so the tests run with
# the latest sources instead of those fetched from npm.

# Link local modules into the global store
pushd ts && npm link && popd
pushd grpc-web-node-http-transport && npm link && popd

# Link dependencies from the global store
pushd grpc-web-node-http-transport && npm link grpc-web-client && popd
pushd test && npm link grpc-web-node-http-transport && popd
