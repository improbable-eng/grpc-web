#!/bin/bash
# Runs the tests in the environment
npm run build

set -ex

if [ -z "$BROWSER" ]; then
  # No environment is specified - run all tests
  npm run test:node
  npm run test:browser
  exit 0
fi

if [ "$BROWSER" == "nodejs" ]; then
  # Node is specified
  npm run test:node
  exit 0
fi

# A $BROWSER is specified - run only the browser tests
npm run test:browser
exit 0
