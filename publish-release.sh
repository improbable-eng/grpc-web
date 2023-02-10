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

echo "Generating proxy binaries"
cd go
rm -rf dist
mkdir -p dist
GOOS=linux GOARCH=amd64 go build -o "dist/grpcwebproxy-$TAG-linux-x86_64" ./grpcwebproxy
GOOS=windows GOARCH=amd64 go build -o "dist/grpcwebproxy-$TAG-win64.exe" ./grpcwebproxy
GOOS=windows GOARCH=386 go build -o "dist/grpcwebproxy-$TAG-win32.exe" ./grpcwebproxy
GOOS=darwin GOARCH=amd64 go build -o "dist/grpcwebproxy-$TAG-osx-x86_64" ./grpcwebproxy
GOARCH=arm64 go build -o "dist/grpcwebproxy-$TAG-arm64" ./grpcwebproxy
GOARM=5 GOARCH=arm go build -o "dist/grpcwebproxy-$TAG-arm5" ./grpcwebproxy
GOARM=6 GOARCH=arm go build -o "dist/grpcwebproxy-$TAG-arm6" ./grpcwebproxy
GOARM=7 GOARCH=arm go build -o "dist/grpcwebproxy-$TAG-arm7" ./grpcwebproxy
for f in dist/*; do zip -9r "$f.zip" "$f"; done
ls -l ./dist
cd ..

echo "Generating client binaries"
npm run clean
npm install

echo "Publishing $TAG"

# Create github release and attach server binaries
./node_modules/.bin/github-release upload \
  --owner improbable-eng \
  --repo grpc-web \
  --tag "$TAG" \
  --name "$TAG" \
  --body "See [CHANGELOG](https://github.com/improbable-eng/grpc-web/blob/master/CHANGELOG.md) for details" \
  go/dist/*.zip

# Publish client modules to NPM.
npx lerna publish $TAG --yes
