#!/bin/bash
# Installs prototool; used for managing protoc the installation and compilation flags.
# This script is intended to be run by Travis CI

set -ex

curl -sSL \
  https://github.com/uber/prototool/releases/download/v1.7.0/prototool-$(uname -s)-$(uname -m) \
  -o /usr/local/bin/prototool && \
  chmod +x /usr/local/bin/prototool
