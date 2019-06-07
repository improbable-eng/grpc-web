// package: improbable.grpcweb.test
// file: improbable/grpcweb/test/test.proto

import * as improbable_grpcweb_test_test_pb from "../../../improbable/grpcweb/test/test_pb";
import * as google_protobuf_empty_pb from "google-protobuf/google/protobuf/empty_pb";
import {grpc} from "@improbable-eng/grpc-web";

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

interface UnaryResponse {
  cancel(): void;
}
interface ResponseStream<T> {
  cancel(): void;
  on(type: 'data', handler: (message: T) => void): ResponseStream<T>;
  on(type: 'end', handler: (status?: Status) => void): ResponseStream<T>;
  on(type: 'status', handler: (status: Status) => void): ResponseStream<T>;
}
interface RequestStream<T> {
  write(message: T): RequestStream<T>;
  end(): void;
  cancel(): void;
  on(type: 'end', handler: (status?: Status) => void): RequestStream<T>;
  on(type: 'status', handler: (status: Status) => void): RequestStream<T>;
}
interface BidirectionalStream<ReqT, ResT> {
  write(message: ReqT): BidirectionalStream<ReqT, ResT>;
  end(): void;
  cancel(): void;
  on(type: 'data', handler: (message: ResT) => void): BidirectionalStream<ReqT, ResT>;
  on(type: 'end', handler: (status?: Status) => void): BidirectionalStream<ReqT, ResT>;
  on(type: 'status', handler: (status: Status) => void): BidirectionalStream<ReqT, ResT>;
}

export class TestServiceClient {
  readonly serviceHost: string;

  constructor(serviceHost: string, options?: grpc.RpcOptions);
  pingEmpty(
    requestMessage: google_protobuf_empty_pb.Empty,
    metadata: grpc.Metadata,
    callback: (error: ServiceError|null, responseMessage: improbable_grpcweb_test_test_pb.PingResponse|null) => void
  ): UnaryResponse;
  pingEmpty(
    requestMessage: google_protobuf_empty_pb.Empty,
    callback: (error: ServiceError|null, responseMessage: improbable_grpcweb_test_test_pb.PingResponse|null) => void
  ): UnaryResponse;
  ping(
    requestMessage: improbable_grpcweb_test_test_pb.PingRequest,
    metadata: grpc.Metadata,
    callback: (error: ServiceError|null, responseMessage: improbable_grpcweb_test_test_pb.PingResponse|null) => void
  ): UnaryResponse;
  ping(
    requestMessage: improbable_grpcweb_test_test_pb.PingRequest,
    callback: (error: ServiceError|null, responseMessage: improbable_grpcweb_test_test_pb.PingResponse|null) => void
  ): UnaryResponse;
  pingError(
    requestMessage: improbable_grpcweb_test_test_pb.PingRequest,
    metadata: grpc.Metadata,
    callback: (error: ServiceError|null, responseMessage: google_protobuf_empty_pb.Empty|null) => void
  ): UnaryResponse;
  pingError(
    requestMessage: improbable_grpcweb_test_test_pb.PingRequest,
    callback: (error: ServiceError|null, responseMessage: google_protobuf_empty_pb.Empty|null) => void
  ): UnaryResponse;
  pingList(requestMessage: improbable_grpcweb_test_test_pb.PingRequest, metadata?: grpc.Metadata): ResponseStream<improbable_grpcweb_test_test_pb.PingResponse>;
  pingPongBidi(metadata?: grpc.Metadata): BidirectionalStream<improbable_grpcweb_test_test_pb.PingRequest, improbable_grpcweb_test_test_pb.PingResponse>;
  pingStream(metadata?: grpc.Metadata): RequestStream<improbable_grpcweb_test_test_pb.PingRequest>;
  echo(
    requestMessage: improbable_grpcweb_test_test_pb.TextMessage,
    metadata: grpc.Metadata,
    callback: (error: ServiceError|null, responseMessage: improbable_grpcweb_test_test_pb.TextMessage|null) => void
  ): UnaryResponse;
  echo(
    requestMessage: improbable_grpcweb_test_test_pb.TextMessage,
    callback: (error: ServiceError|null, responseMessage: improbable_grpcweb_test_test_pb.TextMessage|null) => void
  ): UnaryResponse;
}

export class TestUtilServiceClient {
  readonly serviceHost: string;

  constructor(serviceHost: string, options?: grpc.RpcOptions);
  continueStream(
    requestMessage: improbable_grpcweb_test_test_pb.ContinueStreamRequest,
    metadata: grpc.Metadata,
    callback: (error: ServiceError|null, responseMessage: google_protobuf_empty_pb.Empty|null) => void
  ): UnaryResponse;
  continueStream(
    requestMessage: improbable_grpcweb_test_test_pb.ContinueStreamRequest,
    callback: (error: ServiceError|null, responseMessage: google_protobuf_empty_pb.Empty|null) => void
  ): UnaryResponse;
  checkStreamClosed(
    requestMessage: improbable_grpcweb_test_test_pb.CheckStreamClosedRequest,
    metadata: grpc.Metadata,
    callback: (error: ServiceError|null, responseMessage: improbable_grpcweb_test_test_pb.CheckStreamClosedResponse|null) => void
  ): UnaryResponse;
  checkStreamClosed(
    requestMessage: improbable_grpcweb_test_test_pb.CheckStreamClosedRequest,
    callback: (error: ServiceError|null, responseMessage: improbable_grpcweb_test_test_pb.CheckStreamClosedResponse|null) => void
  ): UnaryResponse;
}

export class FailServiceClient {
  readonly serviceHost: string;

  constructor(serviceHost: string, options?: grpc.RpcOptions);
  nonExistant(
    requestMessage: improbable_grpcweb_test_test_pb.PingRequest,
    metadata: grpc.Metadata,
    callback: (error: ServiceError|null, responseMessage: improbable_grpcweb_test_test_pb.PingResponse|null) => void
  ): UnaryResponse;
  nonExistant(
    requestMessage: improbable_grpcweb_test_test_pb.PingRequest,
    callback: (error: ServiceError|null, responseMessage: improbable_grpcweb_test_test_pb.PingResponse|null) => void
  ): UnaryResponse;
}

