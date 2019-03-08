# @improbable-eng/protoc-gen-improbable-grpc-web
protoc-plugin for generating @improbable-eng/grpc-web service clients. 

## Usage
This plugin should be used in conjunction with the [protoc-js plugin](https://developers.google.com/protocol-buffers/docs/reference/javascript-generated) with the following caveats: 
1. The output directory must be consistent between both plugins (ie: `js_out` and `improbable-grpc-web_out`).
2. You must use `import_style=commonjs,binary` in your protoc-js plugin configuration.

```bash
OUT_DIR="generated"
protoc \
    --plugin=protoc-gen-improbable-grpc-web=./bin/protoc-gen-improbable-grpc-web \
    --js_out=import_style=commonjs,binary:${OUT_DIR} \
    --improbable-grpc-web_out=${OUT_DIR} \
    ./proto/some.proto
```
