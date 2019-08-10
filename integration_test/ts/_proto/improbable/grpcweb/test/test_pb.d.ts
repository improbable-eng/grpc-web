// package: improbable.grpcweb.test
// file: improbable/grpcweb/test/test.proto

import * as jspb from "google-protobuf";
import * as google_protobuf_empty_pb from "google-protobuf/google/protobuf/empty_pb";

export class PingRequest extends jspb.Message {
  getValue(): string;
  setValue(value: string): void;

  getResponseCount(): number;
  setResponseCount(value: number): void;

  getErrorCodeReturned(): number;
  setErrorCodeReturned(value: number): void;

  getFailureType(): PingRequest.FailureTypeMap[keyof PingRequest.FailureTypeMap];
  setFailureType(value: PingRequest.FailureTypeMap[keyof PingRequest.FailureTypeMap]): void;

  getCheckMetadata(): boolean;
  setCheckMetadata(value: boolean): void;

  getSendHeaders(): boolean;
  setSendHeaders(value: boolean): void;

  getSendTrailers(): boolean;
  setSendTrailers(value: boolean): void;

  getStreamIdentifier(): string;
  setStreamIdentifier(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PingRequest.AsObject;
  static toObject(includeInstance: boolean, msg: PingRequest): PingRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: PingRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PingRequest;
  static deserializeBinaryFromReader(message: PingRequest, reader: jspb.BinaryReader): PingRequest;
}

export namespace PingRequest {
  export type AsObject = {
    value: string,
    responseCount: number,
    errorCodeReturned: number,
    failureType: PingRequest.FailureTypeMap[keyof PingRequest.FailureTypeMap],
    checkMetadata: boolean,
    sendHeaders: boolean,
    sendTrailers: boolean,
    streamIdentifier: string,
  }

  export interface FailureTypeMap {
    NONE: 0;
    CODE: 1;
    CODE_UNICODE: 3;
  }

  export const FailureType: FailureTypeMap;
}

export class PingResponse extends jspb.Message {
  getValue(): string;
  setValue(value: string): void;

  getCounter(): number;
  setCounter(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PingResponse.AsObject;
  static toObject(includeInstance: boolean, msg: PingResponse): PingResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: PingResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PingResponse;
  static deserializeBinaryFromReader(message: PingResponse, reader: jspb.BinaryReader): PingResponse;
}

export namespace PingResponse {
  export type AsObject = {
    value: string,
    counter: number,
  }
}

export class TextMessage extends jspb.Message {
  getText(): string;
  setText(value: string): void;

  getSendHeaders(): boolean;
  setSendHeaders(value: boolean): void;

  getSendTrailers(): boolean;
  setSendTrailers(value: boolean): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TextMessage.AsObject;
  static toObject(includeInstance: boolean, msg: TextMessage): TextMessage.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: TextMessage, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TextMessage;
  static deserializeBinaryFromReader(message: TextMessage, reader: jspb.BinaryReader): TextMessage;
}

export namespace TextMessage {
  export type AsObject = {
    text: string,
    sendHeaders: boolean,
    sendTrailers: boolean,
  }
}

export class ContinueStreamRequest extends jspb.Message {
  getStreamIdentifier(): string;
  setStreamIdentifier(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ContinueStreamRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ContinueStreamRequest): ContinueStreamRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ContinueStreamRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ContinueStreamRequest;
  static deserializeBinaryFromReader(message: ContinueStreamRequest, reader: jspb.BinaryReader): ContinueStreamRequest;
}

export namespace ContinueStreamRequest {
  export type AsObject = {
    streamIdentifier: string,
  }
}

export class CheckStreamClosedRequest extends jspb.Message {
  getStreamIdentifier(): string;
  setStreamIdentifier(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CheckStreamClosedRequest.AsObject;
  static toObject(includeInstance: boolean, msg: CheckStreamClosedRequest): CheckStreamClosedRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: CheckStreamClosedRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CheckStreamClosedRequest;
  static deserializeBinaryFromReader(message: CheckStreamClosedRequest, reader: jspb.BinaryReader): CheckStreamClosedRequest;
}

export namespace CheckStreamClosedRequest {
  export type AsObject = {
    streamIdentifier: string,
  }
}

export class CheckStreamClosedResponse extends jspb.Message {
  getClosed(): boolean;
  setClosed(value: boolean): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CheckStreamClosedResponse.AsObject;
  static toObject(includeInstance: boolean, msg: CheckStreamClosedResponse): CheckStreamClosedResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: CheckStreamClosedResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CheckStreamClosedResponse;
  static deserializeBinaryFromReader(message: CheckStreamClosedResponse, reader: jspb.BinaryReader): CheckStreamClosedResponse;
}

export namespace CheckStreamClosedResponse {
  export type AsObject = {
    closed: boolean,
  }
}

