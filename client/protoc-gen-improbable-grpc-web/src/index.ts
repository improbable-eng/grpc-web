import {ExportMap} from "./exportmap";
import {GrpcWebCodeGenerator} from "./codegen";
import {
  CodeGeneratorRequest, CodeGeneratorResponse, CodeGeneratorResponseError,
  OutputFile
} from "protoc-plugin";

CodeGeneratorRequest()
  .then((req)  => {
    const output: OutputFile[] = [];
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