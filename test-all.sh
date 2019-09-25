#!/bin/bash
set -e

echo "Testing go sources"
export GO111MODULE=on
cd go && go test ./... && cd ..

echo "Testing TypeScript sources"
npm run test
