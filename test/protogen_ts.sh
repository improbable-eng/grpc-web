#!/bin/bash
# Generates protobuf JS datastructures from the proto/ directory using the *official JS* codegen..

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
PROTOBUF_DIR=${PROTOBUF_DIR-${SCRIPT_DIR}/proto}
PROTOGEN_DIR=ts/_proto
GENERATION_DIR=${GENERATION_DIR-${SCRIPT_DIR}/${PROTOGEN_DIR}}

# Builds all .proto files in a given package dirctory.
# NOTE: All .proto files in a given package must be processed *together*, otherwise the self-referencing
# between files in the same proto package will not work.
function proto_build_dir {
  DIR_FULL=${1}
  DIR_REL=${1##${PROTOBUF_DIR}}
  DIR_REL=${DIR_REL#/}
  echo -n "proto_build: $DIR_REL "
  mkdir -p ${GENERATION_DIR}/${DIR_REL} 2> /dev/null
  protoc \
    --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
    -I${PROTOBUF_DIR} \
    --js_out=import_style=commonjs,binary:${GENERATION_DIR} \
    --ts_out=service=true:${GENERATION_DIR} \
    ${DIR_FULL}/*.proto || exit $?
  echo "DONE"
}

# Generate files for each proto package directory.
for dir in `find -L ${PROTOBUF_DIR} -type d`; do
  if [[ "$dir" == ${PROTOGEN_DIR} ]]; then
      continue
  fi
  if [ -n "$(ls $dir/*.proto 2>/dev/null)" ]; then
    proto_build_dir ${dir} || exit 1
  fi
done
