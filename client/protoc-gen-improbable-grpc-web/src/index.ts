import {ExportMap} from "./exportmap";
import {GrpcWebCodeGenerator} from "./codegen";
import {
  CodeGeneratorRequest as pb_CodeGeneratorRequest,
  CodeGeneratorResponse as pb_CodeGeneratorResponse
} from "google-protobuf/google/protobuf/compiler/plugin_pb";

// TODO: Publish @types for protoc-plugin
declare function require(path: string): any;
const {CodeGeneratorRequest, CodeGeneratorResponse, CodeGeneratorResponseError} = require('protoc-plugin')

CodeGeneratorRequest()
  .then((req: pb_CodeGeneratorRequest)  => {
    const output: pb_CodeGeneratorResponse.File.AsObject[] = [];
    const exportMap = new ExportMap(req.getProtoFileList());
    const codeGen = new GrpcWebCodeGenerator(exportMap);

    const descriptors = req.getFileToGenerateList()
      .map((filename: string) => exportMap.getDescriptor(filename)!);

    for (const f of codeGen.generate(descriptors)) {
      output.push(f);
    }

    return output;
  })
  .then(CodeGeneratorResponse())
  .catch(CodeGeneratorResponseError());