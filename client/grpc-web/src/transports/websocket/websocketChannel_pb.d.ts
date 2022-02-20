// package: grpcweb
// file: websocketChannel.proto

import * as jspb from "google-protobuf";

export class GrpcFrame extends jspb.Message {
  getStreamid(): number;
  setStreamid(value: number): void;

  hasHeader(): boolean;
  clearHeader(): void;
  getHeader(): Header | undefined;
  setHeader(value?: Header): void;

  hasBody(): boolean;
  clearBody(): void;
  getBody(): Body | undefined;
  setBody(value?: Body): void;

  hasComplete(): boolean;
  clearComplete(): void;
  getComplete(): Complete | undefined;
  setComplete(value?: Complete): void;

  hasFailure(): boolean;
  clearFailure(): void;
  getFailure(): Failure | undefined;
  setFailure(value?: Failure): void;

  hasCancel(): boolean;
  clearCancel(): void;
  getCancel(): Cancel | undefined;
  setCancel(value?: Cancel): void;

  getPayloadCase(): GrpcFrame.PayloadCase;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GrpcFrame.AsObject;
  static toObject(includeInstance: boolean, msg: GrpcFrame): GrpcFrame.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: GrpcFrame, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GrpcFrame;
  static deserializeBinaryFromReader(message: GrpcFrame, reader: jspb.BinaryReader): GrpcFrame;
}

export namespace GrpcFrame {
  export type AsObject = {
    streamid: number,
    header?: Header.AsObject,
    body?: Body.AsObject,
    complete?: Complete.AsObject,
    failure?: Failure.AsObject,
    cancel?: Cancel.AsObject,
  }

  export enum PayloadCase {
    PAYLOAD_NOT_SET = 0,
    HEADER = 3,
    BODY = 4,
    COMPLETE = 5,
    FAILURE = 6,
    CANCEL = 7,
  }
}

export class Header extends jspb.Message {
  getOperation(): string;
  setOperation(value: string): void;

  getHeadersMap(): jspb.Map<string, HeaderValue>;
  clearHeadersMap(): void;
  getStatus(): number;
  setStatus(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Header.AsObject;
  static toObject(includeInstance: boolean, msg: Header): Header.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Header, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Header;
  static deserializeBinaryFromReader(message: Header, reader: jspb.BinaryReader): Header;
}

export namespace Header {
  export type AsObject = {
    operation: string,
    headersMap: Array<[string, HeaderValue.AsObject]>,
    status: number,
  }
}

export class HeaderValue extends jspb.Message {
  clearValueList(): void;
  getValueList(): Array<string>;
  setValueList(value: Array<string>): void;
  addValue(value: string, index?: number): string;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): HeaderValue.AsObject;
  static toObject(includeInstance: boolean, msg: HeaderValue): HeaderValue.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: HeaderValue, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): HeaderValue;
  static deserializeBinaryFromReader(message: HeaderValue, reader: jspb.BinaryReader): HeaderValue;
}

export namespace HeaderValue {
  export type AsObject = {
    valueList: Array<string>,
  }
}

export class Body extends jspb.Message {
  getData(): Uint8Array | string;
  getData_asU8(): Uint8Array;
  getData_asB64(): string;
  setData(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Body.AsObject;
  static toObject(includeInstance: boolean, msg: Body): Body.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Body, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Body;
  static deserializeBinaryFromReader(message: Body, reader: jspb.BinaryReader): Body;
}

export namespace Body {
  export type AsObject = {
    data: Uint8Array | string,
  }
}

export class Complete extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Complete.AsObject;
  static toObject(includeInstance: boolean, msg: Complete): Complete.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Complete, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Complete;
  static deserializeBinaryFromReader(message: Complete, reader: jspb.BinaryReader): Complete;
}

export namespace Complete {
  export type AsObject = {
  }
}

export class Failure extends jspb.Message {
  getErrormessage(): string;
  setErrormessage(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Failure.AsObject;
  static toObject(includeInstance: boolean, msg: Failure): Failure.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Failure, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Failure;
  static deserializeBinaryFromReader(message: Failure, reader: jspb.BinaryReader): Failure;
}

export namespace Failure {
  export type AsObject = {
    errormessage: string,
  }
}

export class Cancel extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Cancel.AsObject;
  static toObject(includeInstance: boolean, msg: Cancel): Cancel.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Cancel, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Cancel;
  static deserializeBinaryFromReader(message: Cancel, reader: jspb.BinaryReader): Cancel;
}

export namespace Cancel {
  export type AsObject = {
  }
}

