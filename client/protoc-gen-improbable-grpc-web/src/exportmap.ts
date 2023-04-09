import {
  FileDescriptorProto,
  DescriptorProto,
  MessageOptions,
  EnumOptions,
  FieldDescriptorProto
} from "google-protobuf/google/protobuf/descriptor_pb";

import Type = FieldDescriptorProto.Type;
import {makeImportTargetNamespace} from "./util";

export type ExportMessageEntry = {
  pkg: string,
  fileName: string,
  messageOptions: MessageOptions,
};

export type ExportEnumEntry = {
  pkg: string,
  fileName: string,
  enumOptions: EnumOptions,
};

const MESSAGE_TYPE = 11;
const BYTES_TYPE = 12;
const ENUM_TYPE = 14;

const TypeNumToTypeString: {[key: number]: string} = {}
TypeNumToTypeString[1] = "number"; // TYPE_DOUBLE
TypeNumToTypeString[2] = "number"; // TYPE_FLOAT
TypeNumToTypeString[3] = "number"; // TYPE_INT64
TypeNumToTypeString[4] = "number"; // TYPE_UINT64
TypeNumToTypeString[5] = "number"; // TYPE_INT32
TypeNumToTypeString[6] = "number"; // TYPE_FIXED64
TypeNumToTypeString[7] = "number"; // TYPE_FIXED32
TypeNumToTypeString[8] = "boolean"; // TYPE_BOOL
TypeNumToTypeString[9] = "string"; // TYPE_STRING
TypeNumToTypeString[10] = "Object"; // TYPE_GROUP
TypeNumToTypeString[MESSAGE_TYPE] = "Object"; // TYPE_MESSAGE - Length-delimited aggregate.
TypeNumToTypeString[BYTES_TYPE] = "Uint8Array"; // TYPE_BYTES
TypeNumToTypeString[13] = "number"; // TYPE_UINT32
TypeNumToTypeString[ENUM_TYPE] = "number"; // TYPE_ENUM
TypeNumToTypeString[15] = "number"; // TYPE_SFIXED32
TypeNumToTypeString[16] = "number"; // TYPE_SFIXED64
TypeNumToTypeString[17] = "number"; // TYPE_SINT32 - Uses ZigZag encoding.
TypeNumToTypeString[18] = "number"; // TYPE_SINT64 - Uses ZigZag encoding.

const defaultWellKnownTypes = {
  "google/protobuf/compiler/plugin.proto": "google-protobuf/google/protobuf/compiler/plugin_pb",
  "google/protobuf/any.proto": "google-protobuf/google/protobuf/any_pb",
  "google/protobuf/api.proto": "google-protobuf/google/protobuf/api_pb",
  "google/protobuf/descriptor.proto": "google-protobuf/google/protobuf/descriptor_pb",
  "google/protobuf/duration.proto": "google-protobuf/google/protobuf/duration_pb",
  "google/protobuf/empty.proto": "google-protobuf/google/protobuf/empty_pb",
  "google/protobuf/field_mask.proto": "google-protobuf/google/protobuf/field_mask_pb",
  "google/protobuf/source_context.proto": "google-protobuf/google/protobuf/source_context_pb",
  "google/protobuf/struct.proto": "google-protobuf/google/protobuf/struct_pb",
  "google/protobuf/timestamp.proto": "google-protobuf/google/protobuf/timestamp_pb",
  "google/protobuf/type.proto": "google-protobuf/google/protobuf/type_pb",
  "google/protobuf/wrappers.proto": "google-protobuf/google/protobuf/wrappers_pb"
};

export class ExportMap {
  private messageMap: {[key: string]: ExportMessageEntry} = {};
  private enumMap: {[key: string]: ExportEnumEntry} = {};
  private fileDescriptorMap: {[key:string]: FileDescriptorProto} = {};
  private wellKnownTypesMap: {[key: string]: string} = defaultWellKnownTypes;

  constructor(descriptors: FileDescriptorProto[]) {
    descriptors.forEach(d => {
      this.add(d);
    });
  }

  getMessage(str: string): ExportMessageEntry | undefined {
    return this.messageMap[str];
  }

  getEnum(str: string): ExportEnumEntry | undefined {
    return this.enumMap[str];
  }

  getDescriptor(filename: string): FileDescriptorProto | undefined {
    return this.fileDescriptorMap[filename];
  }

  isWellKnownType(filename: string): boolean {
    return filename in this.wellKnownTypesMap;
  }

  getWellKnownTypeImportPath(filename: string): string | undefined {
    return this.wellKnownTypesMap[filename];
  }

  getMessageType(typeName: string, currentFileName: string): string {
    return this.getFieldType(MESSAGE_TYPE, typeName, currentFileName);
  }

  getFieldType(type: Type, typeName: string, currentFileName: string): string {
    if (type === MESSAGE_TYPE) {
      const fromExport = this.getMessage(typeName);
      if (!fromExport) {
        throw new Error("Could not getFieldType for message: " + typeName);
      }
      const withinNamespace = this.withinNamespaceFromExportEntry(typeName, fromExport);
      if (fromExport.fileName === currentFileName) {
        return withinNamespace;
      }
      return makeImportTargetNamespace(fromExport.fileName) + "." + withinNamespace;
    }
    if (type === ENUM_TYPE) {
      const fromExport = this.getEnum(typeName);
      if (!fromExport) {
        throw new Error("Could not getFieldType for enum: " + typeName);
      }
      const withinNamespace = this.withinNamespaceFromExportEntry(typeName, fromExport);
      if (fromExport.fileName === currentFileName) {
        return withinNamespace;
      } else {
        return makeImportTargetNamespace(fromExport.fileName) + "." + withinNamespace;
      }
    } else {
      return TypeNumToTypeString[type];
    }
  }

  private add(fileDescriptor: FileDescriptorProto) {
    const scope: string = fileDescriptor.getPackage();
    const packagePrefix = this.makePackagePrefix(scope);

    this.fileDescriptorMap[fileDescriptor.getName()] = fileDescriptor;

    fileDescriptor.getMessageTypeList().forEach(messageType => {
      this.exportNested(scope, fileDescriptor, messageType);
    });

    fileDescriptor.getEnumTypeList().forEach(enumType => {
      const qualifiedEnumName = `${packagePrefix}${enumType.getName()}`;
      this.enumMap[qualifiedEnumName] = {
        pkg: fileDescriptor.getPackage(),
        fileName: fileDescriptor.getName()!,
        enumOptions: enumType.getOptions()!,
      };
    });
  }

  private exportNested(scope: string, fileDescriptor: FileDescriptorProto, message: DescriptorProto) {
    const messageEntry: ExportMessageEntry = {
      pkg: fileDescriptor.getPackage(),
      fileName: fileDescriptor.getName()!,
      messageOptions: message.getOptions(),
    };

    const packagePrefix = this.makePackagePrefix(scope);
    const entryName = `${packagePrefix}${message.getName()}`;
    this.messageMap[entryName] = messageEntry;

    message.getNestedTypeList().forEach(nested => {
      this.exportNested(`${packagePrefix}${message.getName()}`, fileDescriptor, nested);
    });

    message.getEnumTypeList().forEach(enumType => {
      const identifier = `${packagePrefix}${message.getName()}.${enumType.getName()}`;
      this.enumMap[identifier] = {
        pkg: fileDescriptor.getPackage(),
        fileName: fileDescriptor.getName()!,
        enumOptions: enumType.getOptions()!
      };
    });
  }

  withinNamespaceFromExportEntry(name: string, exportEntry: ExportMessageEntry | ExportEnumEntry) {
    return exportEntry.pkg ? name.substring(exportEntry.pkg.length + 1) : name;
  }

  private makePackagePrefix(scope: string) {
    if (scope.length === 0) {
      return "";
    }
    return `${scope}.`;
  }
}
