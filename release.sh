#!/bin/bash

set -e

pushd $(dirname $0) > /dev/null
SCRIPT_PATH=$(pwd)
popd > /dev/null

command -v github-release > /dev/null 2>&1 || {
  echo "github-release not found, check it's on your PATH or install via:"
  echo "  go get github.com/c4milo/github-release"
  echo
  exit 1
}

command -v jq > /dev/null 2>&1 || {
  echo "jq not found, check it's on your PATH or install via:"
  echo "  brew install jq"
  echo
  exit 1
}

if [[ -z "${GITHUB_TOKEN}" ]]; then
  echo "GITHUB_TOKEN environment variable not set."
  echo
  exit 1
fi

PKG_JSON_PATH="${SCRIPT_PATH}/ts/package.json"
echo "Reading version from ${PKG_JSON_PATH}."

VERSION=$(jq --raw-output '.version' ${PKG_JSON_PATH})
read -p "Build v${VERSION}? " -n 1 -r
echo
if [[ ! ${REPLY} =~ ^[Yy]$ ]]; then
  exit 1
fi

DIST_PATH="${SCRIPT_PATH}/dist"
rm -rf "${DIST_PATH}"
mkdir -p "${DIST_PATH}"

echo "Building grpcweb-proxy"
cd "${SCRIPT_PATH}/go/grpcwebproxy" \
  && GOOS=linux GOARCH=amd64 go build -o "${DIST_PATH}/grpcweb-proxy_${VERSION}_linux_amd64" . \
  && GOOS=darwin GOARCH=amd64 go build -o "${DIST_PATH}/grpcweb-proxy_${VERSION}_darwin_amd64" .

echo "Building grpcweb-client"
cd "${SCRIPT_PATH}/ts" \
  && npm run -s lib:build \
  && cd ${SCRIPT_PATH}/ts/dist \
  && zip -q -r "${DIST_PATH}/grpcweb-client_${VERSION}.zip" *


echo "Github Release Notes (terminate with ctrl-d):"
RELEASE_NOTES=$(cat)

read -p "Release v${VERSION}? " -n 1 -r
echo
if [[ ! ${REPLY} =~ ^[Yy]$ ]]; then
  exit 1
fi

echo "Creating Github Release"
github-release "improbable-eng/grpc-web" "${VERSION}" master "${RELEASE_NOTES}" "${DIST_PATH}/*"

echo "Publishing to npm"
cd "${SCRIPT_PATH}/ts" && npm publish
