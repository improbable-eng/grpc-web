#!/bin/bash
set -e
set +o pipefail

if [ -z "$PREBUILT_INTEGRATION_TESTS" ]; then
  echo "Building integration test JS"
  npm run build
else
  echo "Skipping integration test JS build because PREBUILT_INTEGRATION_TESTS is set"
fi

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
