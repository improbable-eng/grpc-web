#!/bin/bash

set -e

echo "Linting go sources"
pushd ./go
./checkup.sh
./fixup.sh
popd

echo "Linting Typescript sources"
npm run lint
