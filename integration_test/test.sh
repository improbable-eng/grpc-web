#!/bin/bash
set -e
set +o pipefail

npm run build
npm run test:node
npm run test:browsers
