#!/bin/bash
# Installs buf; used for generating and linting protofiles.
# This script is intended to be run by CI

set -ex

if [[ -z "$BUF_VER" ]]; then
  echo "BUF_VER environment variable not set"
  exit 1
fi

curl -sSL \
  https://github.com/bufbuild/buf/releases/download/v${BUF_VER}/buf-$(uname -s)-$(uname -m) \
  -o ./buf && \
  chmod +x ./buf

echo 'export PATH=$PATH:$PWD' >> $BASH_ENV
