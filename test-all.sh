#!/bin/bash
set -e

echo "Testing go sources"
cd go && go test ./... && cd ..

echo "Testing TypeScript sources"
npm run test
