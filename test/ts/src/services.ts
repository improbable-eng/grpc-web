import { PingResponse, PingRequest } from "../_proto/improbable/grpcweb/test/test_pb";
import { Empty } from "google-protobuf/google/protobuf/empty_pb";

export class TestService {
  static serviceName: string = "improbable.grpcweb.test.TestService";
}
export namespace TestService {
  export class PingEmpty {
    static methodName = "PingEmpty";
    static service = TestService;
    static requestStream = false;
    static responseStream = false;
    static requestType = Empty;
    static responseType = PingResponse;
  }
  export class Ping {
    static methodName = "Ping";
    static service = TestService;
    static requestStream = false;
    static responseStream = false;
    static requestType = PingRequest;
    static responseType = PingResponse;
  }
  export class PingError {
    static methodName = "PingError";
    static service = TestService;
    static requestStream = false;
    static responseStream = false;
    static requestType = PingRequest;
    static responseType = Empty;
  }
  export class PingList {
    static methodName = "PingList";
    static service = TestService;
    static requestStream = false;
    static responseStream: true;
    static requestType = PingRequest;
    static responseType = PingResponse;
  }
}

export class FailService {
  static serviceName: string = "improbable.grpcweb.test.FailService";
}
export namespace FailService {
  export class NonExistant {
    static methodName = "NonExistant";
    static service = FailService;
    static requestStream = false;
    static responseStream = false;
    static requestType = PingRequest;
    static responseType = PingResponse;
  }
}