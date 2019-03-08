import {ExportMap} from "./exportmap";
import {FileDescriptorProto} from "google-protobuf/google/protobuf/descriptor_pb";
import Project, {CodeBlockWriter} from "ts-morph";
import * as path from "path";
import {trimSuffix, makeImportTargetNamespace, getRelativePathToRoot, trimPrefix} from "./util";

type GeneratedOutput = {
  name: string
  content: string
}

export class GrpcWebCodeGenerator {
  private exportMap: ExportMap;
  private project: Project;

  constructor(exportMap: ExportMap) {
    this.exportMap = exportMap;
    this.project = new Project({
      compilerOptions: {
        declaration: true,
        removeComments: false
      }
    });
  }

  generate(fileDescriptors: FileDescriptorProto[]): GeneratedOutput[] {
    for (const fd of fileDescriptors) {
      const inputFileParts = path.parse(fd.getName());
      const filename = path.join(inputFileParts.dir, `${inputFileParts.name}_pb_service.ts`);

      this.project.createSourceFile(filename, (writer => {
        new ServiceDefinitionBuilder(writer, fd, this.exportMap)
          .writeImports()
          .writeServices();
      }));
    }

    return this.project.emitToMemory().getFiles().map(f => {
      return {
        name: trimPrefix(f.filePath, process.cwd()),
        content: f.text
      }
    })
  }
}

class ServiceDefinitionBuilder {
  private w: CodeBlockWriter;
  private fd: FileDescriptorProto;
  private exportMap: ExportMap;
  private pathToProtoRoot: string;

  constructor(writer: CodeBlockWriter, fd: FileDescriptorProto, exportMap: ExportMap) {
    this.w = writer;
    this.fd = fd;
    this.exportMap = exportMap;
    this.pathToProtoRoot = getRelativePathToRoot(fd.getName());
  }

  writeImports() {
    this.fd.getDependencyList()
      .map(v => {
        const targetNs = makeImportTargetNamespace(v);
        if (this.exportMap.isWellKnownType(v)) {
          return { targetNs, targetPath: this.exportMap.getWellKnownTypeImportPath(v)! }
        }
        return { targetNs, targetPath: this.makeRelativeProtoImportPath(v) }
      })
      .concat({
        targetNs: makeImportTargetNamespace(this.fd.getName()),
        targetPath: this.makeRelativeProtoImportPath(this.fd.getName())
      })
      .forEach(v => {
        this.w.writeLine(`import * as ${v.targetNs} from "${v.targetPath}";`);
      });
    this.w.writeLine(`import { grpc } from '@improbable-eng/grpc-web`);
    this.w.blankLine();
    return this;
  }

  writeServices() {
    this.writeServiceMethodTypes();
    this.writeServiceClasses();
    return this;
  }

  /**
   * qualifiedTypeName return the correct, qualified JavaScript import variable name for a given
   * message type value.
   *
   * @param {string} messageTypeName The name of the proto message to retrieve
   * @returns {string} qualified JavaScript import path (eg: `some_module.Foo`)
   */
  private qualifiedTypeName(messageTypeName: string): string {
    return this.exportMap.getMessageType(trimPrefix(messageTypeName, "."), "");
  }

  /**
   * makeRelativeProtoImportPath is used to generate an import target filepath which is relative
   * to the root of all the generated protos. Note that the `_pb` suffix is added automatically
   * by the 'protocgen-js' plugin.
   *
   * @param {string} protoFilename filename of the proto to generate the import statement for
   * @returns {string} relative import path to the generated javascript sources of the supplied
   *                    proto (note: javascript is generaed by the 'protoc-js' plugin)
   */
  private makeRelativeProtoImportPath(protoFilename: string): string {
    return this.pathToProtoRoot + trimSuffix(protoFilename, ".proto") + "_pb";
  }

  private writeServiceMethodTypes() {
    for (const service of this.fd.getServiceList()) {
      for (const method of service.getMethodList()) {
        this.w.writeLine(`type ${service.getName()}${method.getName()} = {`);
        this.w.indentBlock(() => {
          this.w.indentBlock(() => {
            this.w.writeLine(`methodName: "${method.getName()}"`);
            this.w.writeLine(`service: ${service.getName()}`);
            this.w.writeLine(`requestStream: ${method.getClientStreaming()}`);
            this.w.writeLine(`responseStream: ${method.getServerStreaming()}`);
            this.w.writeLine(`requestType: ${this.qualifiedTypeName(method.getInputType())}`);
            this.w.writeLine(`responseType: ${this.qualifiedTypeName(method.getOutputType())}`);
          });
        });
        this.w.writeLine("}");
      }
    }
  }

  private writeServiceClasses() {
    for (const service of this.fd.getServiceList()) {
      this.w.writeLine(`export class ${service.getName()} {`);
      this.w.indentBlock(() => {
        this.w.writeLine(`static readonly serviceName: string = "${service.getName()}"`);

        for (const method of service.getMethodList()) {
          this.w.writeLine(`static readonly ${method.getName()}: ${service.getName()}${method.getName()} = {`);
          this.w.indentBlock(() => {
            this.w.indentBlock(() => {
              this.w.writeLine(`methodName: "${method.getName()}"`);
              this.w.writeLine(`service: ${service.getName()}`);
              this.w.writeLine(`requestStream: ${method.getClientStreaming()}`);
              this.w.writeLine(`responseStream: ${method.getServerStreaming()}`);
              this.w.writeLine(`requestType: ${this.qualifiedTypeName(method.getInputType())}`);
              this.w.writeLine(`responseType: ${this.qualifiedTypeName(method.getOutputType())}`);
            });
          });
          this.w.writeLine(`}`);
        }

      });
      this.w.writeLine(`}`);
      this.w.blankLine();
    }
  }
}