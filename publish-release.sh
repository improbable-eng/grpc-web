#!/bin/bash
set -e

if [[ -z "$GITHUB_TOKEN" ]]; then
  echo "GITHUB_TOKEN not found in environment"
  exit 1
fi

TAG=$1
if [[ -z "$TAG" ]]; then
  echo "Expected release tag to be passed as the first argument"
  exit 1
fi

if [[ ! "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Invalid release tag: $TAG"
  exit 1
fi

echo "Generating grpcwebproxy binaries"
cd go
rm -rf dist
mkdir -p dist

GOOS=linux GOARCH=amd64 go build -o "dist/grpcwebproxy-$TAG-linux-amd64" ./grpcwebproxy
GOOS=windows GOARCH=amd64 go build -o "dist/grpcwebproxy-$TAG-windows-amd64.exe" ./grpcwebproxy
GOOS=darwin GOARCH=amd64 go build -o "dist/grpcwebproxy-$TAG-darwin-amd64" ./grpcwebproxy
ls -l ./dist
cd ..

echo "Publishing $TAG"

# Create github release and attach server binaries
./node_modules/.bin/github-release upload \
  --owner improbable-eng \
  --repo grpc-web \
  --tag "$TAG" \
  --name "$TAG" \
  --body "See [CHANGELOG](https://github.com/improbable-eng/grpc-web/blob/master/CHANGELOG.md) for details" \
  go/dist/*

# Publish client modules to NPM.
npx lerna publish $TAG --yes
