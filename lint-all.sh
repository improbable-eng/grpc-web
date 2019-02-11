#!/bin/bash

set -e

echo "Linting go sources"
./go/lint.sh

echo "Linting TypeScript sources"
npm run lint
