#!/bin/bash
# Installs prototool; used for managing protoc the installation and compilation flags.
# This script is intended to be run by CI

set -ex

if [[ -z "$PROTOTOOL_VER" ]]; then
  echo "PROTOTOOL_VER environment variable not set"
  exit 1
fi

curl -sSL \
  https://github.com/uber/prototool/releases/download/v${PROTOTOOL_VER}/prototool-$(uname -s)-$(uname -m) \
  -o ./prototool && \
  chmod +x ./prototool

echo 'export PATH=$PATH:$PWD' >> $BASH_ENV
