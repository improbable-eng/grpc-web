#!/bin/bash
# Installs protoc; used for generating JS protobuf stubs.
# This script is intended to be run by CI

set -ex

if [[ -z "$PROTOC_VER" ]]; then
  echo "PROTOC_VER environment variable not set"
  exit 1
fi

curl -sSL \
  https://github.com/protocolbuffers/protobuf/releases/download/v${PROTOC_VER}/protoc-${PROTOC_VER}-linux-$(uname -m).zip \
  -o protoc.zip
rm -rf protoc
mkdir -p protoc
unzip protoc.zip -d protoc
rm protoc.zip
chmod +x ./protoc/bin/protoc

echo 'export PATH=$PATH:$PWD/protoc/bin' >> $BASH_ENV
