#!/usr/bin/env bash
# This is intended to be run by Travis CI

curl -sL https://github.com/google/protobuf/releases/download/v3.2.0/protobuf-cpp-3.2.0.tar.gz | tar zx
cd protobuf-cpp-3.2.0
./configure --prefix=/home/travis && make -j2 && make install
export PATH=/home/travis/bin:$PATH
