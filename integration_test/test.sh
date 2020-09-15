#!/bin/bash
set -e
set +o pipefail

npm run build

if [ -z "$BROWSER" ]; then
  echo "No Browser specified, starting local test run"
  npm run test:node
  npm run test:browser
  exit 0
fi

if [ "$BROWSER" == "nodejs" ]; then
  npm run test:node
  exit 0
fi

npm run test:browser

exit 0
