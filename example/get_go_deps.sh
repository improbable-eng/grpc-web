#!/usr/bin/env bash

echo "Installing go dependencies..."
DEP=command -v dep
if [[ "$DEP" == "" ]]; then
  echo "Cannot find golang's package manager 'dep'. Please follow https://github.com/golang/dep#setup"
  exit -1
fi
cd go
dep ensure

cd ../

echo "Installing Protobuf to Golang compiler..."
go get -u github.com/golang/protobuf/protoc-gen-go
