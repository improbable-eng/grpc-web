#!/usr/bin/env bash
set -e
set -x

bash -o pipefail -c "(export PREBUILT_INTEGRATION_TESTS=1 && export BROWSER_ONLY=1 && npm run start) | ts -s \"%.s\""
