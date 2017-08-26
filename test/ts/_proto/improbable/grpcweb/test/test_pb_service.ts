// package: improbable.grpcweb.test
// file: improbable/grpcweb/test/test.proto

import * as improbable_grpcweb_test_test_pb from "../../../improbable/grpcweb/test/test_pb";
import * as google_protobuf_empty_pb from "google-protobuf/google/protobuf/empty_pb";
export class TestService {
  static serviceName = "improbable.grpcweb.test.TestService";
}
export namespace TestService {
  export class PingEmpty {
    static readonly methodName = "PingEmpty";
    static readonly service = TestService;
    static readonly requestStream = false;
    static readonly responseStream = false;
    static readonly requestType = google_protobuf_empty_pb.Empty;
    static readonly responseType = improbable_grpcweb_test_test_pb.PingResponse;
  }
  export class Ping {
    static readonly methodName = "Ping";
    static readonly service = TestService;
    static readonly requestStream = false;
    static readonly responseStream = false;
    static readonly requestType = improbable_grpcweb_test_test_pb.PingRequest;
    static readonly responseType = improbable_grpcweb_test_test_pb.PingResponse;
  }
  export class PingError {
    static readonly methodName = "PingError";
    static readonly service = TestService;
    static readonly requestStream = false;
    static readonly responseStream = false;
    static readonly requestType = improbable_grpcweb_test_test_pb.PingRequest;
    static readonly responseType = google_protobuf_empty_pb.Empty;
  }
  export class PingList {
    static readonly methodName = "PingList";
    static readonly service = TestService;
    static readonly requestStream = false;
    static readonly responseStream = true;
    static readonly requestType = improbable_grpcweb_test_test_pb.PingRequest;
    static readonly responseType = improbable_grpcweb_test_test_pb.PingResponse;
  }
}
export class TestUtilService {
  static serviceName = "improbable.grpcweb.test.TestUtilService";
}
export namespace TestUtilService {
  export class ContinueStream {
    static readonly methodName = "ContinueStream";
    static readonly service = TestUtilService;
    static readonly requestStream = false;
    static readonly responseStream = false;
    static readonly requestType = improbable_grpcweb_test_test_pb.ContinueStreamRequest;
    static readonly responseType = google_protobuf_empty_pb.Empty;
  }
  export class CheckStreamClosed {
    static readonly methodName = "CheckStreamClosed";
    static readonly service = TestUtilService;
    static readonly requestStream = false;
    static readonly responseStream = false;
    static readonly requestType = improbable_grpcweb_test_test_pb.CheckStreamClosedRequest;
    static readonly responseType = improbable_grpcweb_test_test_pb.CheckStreamClosedResponse;
  }
}
export class FailService {
  static serviceName = "improbable.grpcweb.test.FailService";
}
export namespace FailService {
  export class NonExistant {
    static readonly methodName = "NonExistant";
    static readonly service = FailService;
    static readonly requestStream = false;
    static readonly responseStream = false;
    static readonly requestType = improbable_grpcweb_test_test_pb.PingRequest;
    static readonly responseType = improbable_grpcweb_test_test_pb.PingResponse;
  }
}
