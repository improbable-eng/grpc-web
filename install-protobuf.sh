#!/usr/bin/env bash
# This is intended to be run by Travis CI

set -ex

wget https://github.com/google/protobuf/releases/download/v3.2.0/protoc-3.2.0-linux-x86_64.zip
unzip protoc-3.2.0-linux-x86_64.zip -d protobuf
echo "ls root"
ls
echo "ls protobuf"
ls protobuf
pwd
export PATH=/home/travis/gopath/src/github.com/improbable-eng/grpc-web/protobuf/bin:$PATH
echo $PATH
