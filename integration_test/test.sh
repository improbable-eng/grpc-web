#!/bin/bash
set -e
set +o pipefail

if [ -z "$PREBUILT_INTEGRATION_TESTS" ]; then
  echo "Building integration test JS"
  npm run build
else
  echo "Skipping integration test JS build because PREBUILT_INTEGRATION_TESTS is set"
fi

if [ -z "$BROWSER_ONLY" ]; then
  echo "No Browser only run specified, starting local test run"
  npm run test:node
  npm run test:browsers
  exit 0
fi

if [ "$BROWSER" == "nodejs" ]; then
  npm run test:node
  exit 0
fi

npm run test:browsers

exit 0
