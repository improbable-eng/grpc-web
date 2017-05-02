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

  getFailureType(): PingRequest.FailureType;
  setFailureType(value: PingRequest.FailureType): void;

  getCheckMetadata(): boolean;
  setCheckMetadata(value: boolean): void;

  getSendHeaders(): boolean;
  setSendHeaders(value: boolean): void;

  getSendTrailers(): boolean;
  setSendTrailers(value: boolean): void;

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
    failureType: PingRequest.FailureType,
    checkMetadata: boolean,
    sendHeaders: boolean,
    sendTrailers: boolean,
  }

  export enum FailureType {
    NONE = 0,
    CODE = 1,
    DROP = 2,
  }
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
    Value: string,
    counter: number,
  }
}

