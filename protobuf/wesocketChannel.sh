# currently here as documentation this has to be integrated into the make file:
#go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
#npm install ts-protoc-gen (eat your own dog food)
export PATH="$PATH:$(go env GOPATH)/bin"
mkdir go typescript
PROTOC_GEN_TS_PATH="/home/boris/node_modules/ts-protoc-gen/bin/protoc-gen-ts"

protoc --go_out=go --go_opt=paths=source_relative  --go-grpc_out=go --go-grpc_opt=paths=source_relative websocketChannel.proto
protoc \
    --plugin="protoc-gen-ts=${PROTOC_GEN_TS_PATH}" \
    --js_out="import_style=commonjs,binary:typescript" \
    --ts_out=typescript \
    websocketChannel.proto