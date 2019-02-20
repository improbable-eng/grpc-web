#!/bin/bash

rm -rf build
mkdir -p build

GOOS=linux GOARCH=amd64 go build -o build/grpcwebproxy-v0.8.1-linux-amd64 ./grpcwebproxy
GOOS=windows GOARCH=amd64 go build -o build/grpcwebproxy-v0.8.1-windows-amd64.exe ./grpcwebproxy
GOOS=darwin GOARCH=amd64 go build -o build/grpcwebproxy-v0.8.1-darwin-amd64 ./grpcwebproxy
