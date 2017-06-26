#!/bin/bash -eu

CWD=$(dirname $(readlink -f ${BASH_SOURCE[0]}))

cd ${CWD}
if [ ! -d build ]; then
  mkdir build
fi
cd build
cmake ../exampleserver
make
