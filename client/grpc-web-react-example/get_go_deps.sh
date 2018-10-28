#!/usr/bin/env bash

echo "Installing go dependencies..."
DEP=`command -v dep`
if [[ "$DEP" == "" ]]; then
  echo "Cannot find golang's package manager 'dep'. Please follow https://github.com/golang/dep#setup"
  exit -1
fi
pushd go
dep ensure

