#!/bin/bash
# Generates protobuf JS datastructures from the proto/ directory using the *official JS* codegen..

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
PROTOBUF_DIR=${PROTOBUF_DIR-${SCRIPT_DIR}/../../proto}
PROTOGEN_DIR=_proto
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
    --plugin=protoc-gen-jsgrpc=${SCRIPT_DIR}/node_modules/grpc-tools/bin/grpc_node_plugin \
    -I${PROTOBUF_DIR} \
    --js_out=import_style=commonjs,binary:${GENERATION_DIR} \
    --jsgrpc_out=commonjs,binary:${GENERATION_DIR}\
    ${DIR_FULL}/*.proto || exit $?
  ## XXX: HACK, remove gRPC definitions so that browser stuff can include it.
  # Nuke gRPC import
  find ${GENERATION_DIR} -iname '*grpc_pb.js' -exec sed -i -e "/'grpc'/d" -e "/makeGenericClientConstructor/d" {} \; || exit $?
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
