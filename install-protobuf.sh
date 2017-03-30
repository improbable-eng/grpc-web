#!/usr/bin/env bash
# This is intended to be run by Travis CI

set -ex
wget https://github.com/google/protobuf/releases/download/v3.2.0/protoc-3.2.0-linux-x86_64.zip
unzip protoc-3.2.0-linux-x86_64.zip -d protobuf
