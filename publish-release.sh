#!/bin/bash
set -e

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
./generate-grpcwebproxy-binaries.sh
ls -l ./build
cd ..

echo "Publishing $TAG"

# Create github release and attach server binaries
./node_modules/.bin/github-release upload \
  --owner improbable-eng \
  --repo grpc-web \
  --tag "$TAG" \
  --name "$TAG" \
  --body "See [CHANGELOG](https://github.com/improbable-eng/grpc-web/blob/master/CHANGELOG.md) for details" \
  "go/build/*"

# Publish client modules to NPM.
npx lerna publish $TAG --yes
