#!/bin/bash
set -e
set +o pipefail

MAX_AUTO_RETRY=5

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

# inspired by https://unix.stackexchange.com/a/82602
retry () {
    local n=0

    until [ $n -ge $MAX_AUTO_RETRY ]; do
        set +e
        "$@" && break
        set -e

        n=$[$n+1]
        echo ''
        echo "Attempt ${n} of ${MAX_AUTO_RETRY} failed, trying again ..."
        echo ''
    done

    if [ $n -eq $MAX_AUTO_RETRY ]; then
        echo "Giving up after ${MAX_AUTO_RETRY} retries"
        exit 1
    fi
}

# Note that browser tests in CI are very flaky, hence the need for the retry wrapper.
retry npm run test:browser

exit 0
