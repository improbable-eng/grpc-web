#!/usr/bin/env bash
set -e
set -x

COMMAND="npm run test:browsers"
if [ "$BROWSER" == "nodejs" ]; then
  COMMAND="npm run test:node"
fi

# Avoid rebuilding the go test server
export PREBUILT_INTEGRATION_TESTS=1

# Run the integration tests with timestamped output
bash -o pipefail -c "${COMMAND} | ts -s %.s"
