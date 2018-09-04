// package: improbable.grpcweb.test
// file: improbable/grpcweb/test/test.proto

import * as improbable_grpcweb_test_test_pb from "../../../improbable/grpcweb/test/test_pb";
import * as google_protobuf_empty_pb from "google-protobuf/google/protobuf/empty_pb";
import {grpc} from "grpc-web-client";

type TestServicePingEmpty = {
  readonly methodName: string;
  readonly service: typeof TestService;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof google_protobuf_empty_pb.Empty;
  readonly responseType: typeof improbable_grpcweb_test_test_pb.PingResponse;
};

type TestServicePing = {
  readonly methodName: string;
  readonly service: typeof TestService;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof improbable_grpcweb_test_test_pb.PingRequest;
  readonly responseType: typeof improbable_grpcweb_test_test_pb.PingResponse;
};

type TestServicePingError = {
  readonly methodName: string;
  readonly service: typeof TestService;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof improbable_grpcweb_test_test_pb.PingRequest;
  readonly responseType: typeof google_protobuf_empty_pb.Empty;
};

type TestServicePingList = {
  readonly methodName: string;
  readonly service: typeof TestService;
  readonly requestStream: false;
  readonly responseStream: true;
  readonly requestType: typeof improbable_grpcweb_test_test_pb.PingRequest;
  readonly responseType: typeof improbable_grpcweb_test_test_pb.PingResponse;
};

type TestServicePingPongBidi = {
  readonly methodName: string;
  readonly service: typeof TestService;
  readonly requestStream: true;
  readonly responseStream: true;
  readonly requestType: typeof improbable_grpcweb_test_test_pb.PingRequest;
  readonly responseType: typeof improbable_grpcweb_test_test_pb.PingResponse;
};

type TestServicePingStream = {
  readonly methodName: string;
  readonly service: typeof TestService;
  readonly requestStream: true;
  readonly responseStream: false;
  readonly requestType: typeof improbable_grpcweb_test_test_pb.PingRequest;
  readonly responseType: typeof improbable_grpcweb_test_test_pb.PingResponse;
};

type TestServiceEcho = {
  readonly methodName: string;
  readonly service: typeof TestService;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof improbable_grpcweb_test_test_pb.TextMessage;
  readonly responseType: typeof improbable_grpcweb_test_test_pb.TextMessage;
};

export class TestService {
  static readonly serviceName: string;
  static readonly PingEmpty: TestServicePingEmpty;
  static readonly Ping: TestServicePing;
  static readonly PingError: TestServicePingError;
  static readonly PingList: TestServicePingList;
  static readonly PingPongBidi: TestServicePingPongBidi;
  static readonly PingStream: TestServicePingStream;
  static readonly Echo: TestServiceEcho;
}

type TestUtilServiceContinueStream = {
  readonly methodName: string;
  readonly service: typeof TestUtilService;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof improbable_grpcweb_test_test_pb.ContinueStreamRequest;
  readonly responseType: typeof google_protobuf_empty_pb.Empty;
};

type TestUtilServiceCheckStreamClosed = {
  readonly methodName: string;
  readonly service: typeof TestUtilService;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof improbable_grpcweb_test_test_pb.CheckStreamClosedRequest;
  readonly responseType: typeof improbable_grpcweb_test_test_pb.CheckStreamClosedResponse;
};

export class TestUtilService {
  static readonly serviceName: string;
  static readonly ContinueStream: TestUtilServiceContinueStream;
  static readonly CheckStreamClosed: TestUtilServiceCheckStreamClosed;
}

type FailServiceNonExistant = {
  readonly methodName: string;
  readonly service: typeof FailService;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof improbable_grpcweb_test_test_pb.PingRequest;
  readonly responseType: typeof improbable_grpcweb_test_test_pb.PingResponse;
};

export class FailService {
  static readonly serviceName: string;
  static readonly NonExistant: FailServiceNonExistant;
}

export type ServiceError = { message: string, code: number; metadata: grpc.Metadata }
export type Status = { details: string, code: number; metadata: grpc.Metadata }
export type ServiceClientOptions = { transport: grpc.TransportConstructor; debug?: boolean }

interface ResponseStream<T> {
  cancel(): void;
  on(type: 'data', handler: (message: T) => void): ResponseStream<T>;
  on(type: 'end', handler: () => void): ResponseStream<T>;
  on(type: 'status', handler: (status: Status) => void): ResponseStream<T>;
}

export class TestServiceClient {
  readonly serviceHost: string;

  constructor(serviceHost: string, options?: ServiceClientOptions);
  pingEmpty(
    requestMessage: google_protobuf_empty_pb.Empty,
    metadata: grpc.Metadata,
    callback: (error: ServiceError, responseMessage: improbable_grpcweb_test_test_pb.PingResponse|null) => void
  ): void;
  pingEmpty(
    requestMessage: google_protobuf_empty_pb.Empty,
    callback: (error: ServiceError, responseMessage: improbable_grpcweb_test_test_pb.PingResponse|null) => void
  ): void;
  ping(
    requestMessage: improbable_grpcweb_test_test_pb.PingRequest,
    metadata: grpc.Metadata,
    callback: (error: ServiceError, responseMessage: improbable_grpcweb_test_test_pb.PingResponse|null) => void
  ): void;
  ping(
    requestMessage: improbable_grpcweb_test_test_pb.PingRequest,
    callback: (error: ServiceError, responseMessage: improbable_grpcweb_test_test_pb.PingResponse|null) => void
  ): void;
  pingError(
    requestMessage: improbable_grpcweb_test_test_pb.PingRequest,
    metadata: grpc.Metadata,
    callback: (error: ServiceError, responseMessage: google_protobuf_empty_pb.Empty|null) => void
  ): void;
  pingError(
    requestMessage: improbable_grpcweb_test_test_pb.PingRequest,
    callback: (error: ServiceError, responseMessage: google_protobuf_empty_pb.Empty|null) => void
  ): void;
  pingList(requestMessage: improbable_grpcweb_test_test_pb.PingRequest, metadata?: grpc.Metadata): ResponseStream<improbable_grpcweb_test_test_pb.PingResponse>;
  pingPongBidi(): void;
  pingStream(): void;
  echo(
    requestMessage: improbable_grpcweb_test_test_pb.TextMessage,
    metadata: grpc.Metadata,
    callback: (error: ServiceError, responseMessage: improbable_grpcweb_test_test_pb.TextMessage|null) => void
  ): void;
  echo(
    requestMessage: improbable_grpcweb_test_test_pb.TextMessage,
    callback: (error: ServiceError, responseMessage: improbable_grpcweb_test_test_pb.TextMessage|null) => void
  ): void;
}

export class TestUtilServiceClient {
  readonly serviceHost: string;

  constructor(serviceHost: string, options?: ServiceClientOptions);
  continueStream(
    requestMessage: improbable_grpcweb_test_test_pb.ContinueStreamRequest,
    metadata: grpc.Metadata,
    callback: (error: ServiceError, responseMessage: google_protobuf_empty_pb.Empty|null) => void
  ): void;
  continueStream(
    requestMessage: improbable_grpcweb_test_test_pb.ContinueStreamRequest,
    callback: (error: ServiceError, responseMessage: google_protobuf_empty_pb.Empty|null) => void
  ): void;
  checkStreamClosed(
    requestMessage: improbable_grpcweb_test_test_pb.CheckStreamClosedRequest,
    metadata: grpc.Metadata,
    callback: (error: ServiceError, responseMessage: improbable_grpcweb_test_test_pb.CheckStreamClosedResponse|null) => void
  ): void;
  checkStreamClosed(
    requestMessage: improbable_grpcweb_test_test_pb.CheckStreamClosedRequest,
    callback: (error: ServiceError, responseMessage: improbable_grpcweb_test_test_pb.CheckStreamClosedResponse|null) => void
  ): void;
}

export class FailServiceClient {
  readonly serviceHost: string;

  constructor(serviceHost: string, options?: ServiceClientOptions);
  nonExistant(
    requestMessage: improbable_grpcweb_test_test_pb.PingRequest,
    metadata: grpc.Metadata,
    callback: (error: ServiceError, responseMessage: improbable_grpcweb_test_test_pb.PingResponse|null) => void
  ): void;
  nonExistant(
    requestMessage: improbable_grpcweb_test_test_pb.PingRequest,
    callback: (error: ServiceError, responseMessage: improbable_grpcweb_test_test_pb.PingResponse|null) => void
  ): void;
}

