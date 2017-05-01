// Polyfills
import {FailService, TestService} from "../_proto/improbable/grpcweb/test/test_pb_service";
if (typeof Uint8Array === "undefined") {
  (window as any).Uint8Array = require("typedarray").Uint8Array;
}
if (typeof ArrayBuffer === "undefined") {
  (window as any).ArrayBuffer = require("typedarray").ArrayBuffer;
}
if (typeof DataView === "undefined") {
  (window as any).DataView = require("typedarray").DataView;
}
if (typeof TextDecoder === "undefined") {
  (window as any).TextDecoder = require("text-encoding").TextDecoder;
}

import {
  grpc,
  BrowserHeaders,
} from "../../../ts/src/index";
import Code = grpc.Code;
import {
  Empty,
} from "google-protobuf/google/protobuf/empty_pb";
import {
  PingRequest,
  PingResponse,
} from "../_proto/improbable/grpcweb/test/test_pb";
const {
  validHost,
  invalidHost
} = require("../../hosts-config");
import {assert} from "chai";

const DEBUG: boolean = (window as any).DEBUG;
const USE_HTTPS: boolean = (window as any).USE_HTTPS;
const validHostUrl = USE_HTTPS ? `https://${validHost}:9100` : `http://${validHost}:9090`;
const corsHostUrl = USE_HTTPS ? `https://${invalidHost}:9100` : `http://${invalidHost}:9090`;
const unavailableHost = `${USE_HTTPS ? "https" : "http"}://${validHost}:9999`;
const emptyHost = USE_HTTPS ? `https://${invalidHost}:9105` : `http://${invalidHost}:9095`;


describe("grpc-web-client", () => {
  describe("invoke", () => {
    it("should make a unary request", (done) => {
      let didGetOnHeaders = false;
      let didGetOnMessage = false;

      const ping = new PingRequest();
      ping.setValue("hello world");

      grpc.invoke(TestService.Ping, {
        debug: DEBUG,
        request: ping,
        host: validHostUrl,
        onHeaders: (headers: BrowserHeaders) => {
          didGetOnHeaders = true;
          assert.deepEqual(headers.get("HeaderTestKey1"), ["ServerValue1"]);
          assert.deepEqual(headers.get("HeaderTestKey2"), ["ServerValue2"]);
        },
        onMessage: (message: PingResponse) => {
          didGetOnMessage = true;
          assert.ok(message instanceof PingResponse);
          assert.deepEqual(message.getValue(), "hello world");
          assert.deepEqual(message.getCounter(), 252);
        },
        onEnd: (code: grpc.Code, message: string, trailers: BrowserHeaders) => {
          DEBUG && console.debug("code", code, "message", message);
          assert.strictEqual(code, grpc.Code.OK, "expected OK (0)");
          assert.strictEqual(message, undefined, "expected no message");
          assert.deepEqual(trailers.get("TrailerTestKey1"), ["ServerValue1"]);
          assert.deepEqual(trailers.get("TrailerTestKey2"), ["ServerValue2"]);
          assert.ok(didGetOnHeaders);
          assert.ok(didGetOnMessage);
          done();
        }
      });
    });

    it("should make a unary request with metadata", (done) => {
      let didGetOnHeaders = false;
      let didGetOnMessage = false;

      const ping = new PingRequest();
      ping.setValue("hello world");
      ping.setCheckMetadata(true);

      grpc.invoke(TestService.Ping, {
        debug: DEBUG,
        request: ping,
        metadata: new BrowserHeaders({"HeaderTestKey1": "ClientValue1"}),
        host: validHostUrl,
        onHeaders: (headers: BrowserHeaders) => {
          DEBUG && console.debug("headers", headers);
          didGetOnHeaders = true;
          assert.deepEqual(headers.get("HeaderTestKey1"), ["ServerValue1"]);
          assert.deepEqual(headers.get("HeaderTestKey2"), ["ServerValue2"]);
        },
        onMessage: (message: PingResponse) => {
          didGetOnMessage = true;
          assert.ok(message instanceof PingResponse);
          assert.deepEqual(message.getValue(), "hello world");
          assert.deepEqual(message.getCounter(), 252);
        },
        onEnd: (code: grpc.Code, message: string, trailers: BrowserHeaders) => {
          DEBUG && console.debug("code", code, "message", message, "trailers", trailers);
          assert.strictEqual(code, grpc.Code.OK, "expected OK (0)");
          assert.strictEqual(message, undefined, "expected no message");
          assert.deepEqual(trailers.get("TrailerTestKey1"), ["ServerValue1"]);
          assert.deepEqual(trailers.get("TrailerTestKey2"), ["ServerValue2"]);
          assert.ok(didGetOnHeaders);
          assert.ok(didGetOnMessage);
          done();
        }
      });
    });

    it("should handle a streaming response of multiple messages", (done) => {
      let didGetOnHeaders = false;
      let onMessageId = 0;

      const ping = new PingRequest();
      ping.setValue("hello world");
      ping.setResponseCount(3000);

      grpc.invoke(TestService.PingList, {
        debug: DEBUG,
        request: ping,
        host: validHostUrl,
        onHeaders: (headers: BrowserHeaders) => {
          didGetOnHeaders = true;
          assert.deepEqual(headers.get("HeaderTestKey1"), ["ServerValue1"]);
          assert.deepEqual(headers.get("HeaderTestKey2"), ["ServerValue2"]);
        },
        onMessage: (message: PingResponse) => {
          assert.ok(message instanceof PingResponse);
          assert.strictEqual(message.getCounter(), onMessageId++);
        },
        onEnd: (code: grpc.Code, message: string, trailers: BrowserHeaders) => {
          assert.strictEqual(code, grpc.Code.OK, "expected OK (0)");
          assert.strictEqual(message, undefined, "expected no message");
          assert.deepEqual(trailers.get("TrailerTestKey1"), ["ServerValue1"]);
          assert.deepEqual(trailers.get("TrailerTestKey2"), ["ServerValue2"]);
          assert.ok(didGetOnHeaders);
          assert.strictEqual(onMessageId, 3000);
          done();
        }
      });
    });

    it("should handle a streaming response of no messages", (done) => {
      let didGetOnHeaders = false;
      let onMessageId = 0;

      const ping = new PingRequest();
      ping.setValue("hello world");
      ping.setResponseCount(0);

      grpc.invoke(TestService.PingList, {
        debug: DEBUG,
        request: ping,
        host: validHostUrl,
        onHeaders: (headers: BrowserHeaders) => {
          didGetOnHeaders = true;
          assert.deepEqual(headers.get("HeaderTestKey1"), ["ServerValue1"]);
          assert.deepEqual(headers.get("HeaderTestKey2"), ["ServerValue2"]);
        },
        onMessage: (message: PingResponse) => {
          assert.ok(message instanceof PingResponse);
          assert.strictEqual(message.getCounter(), onMessageId++);
        },
        onEnd: (code: grpc.Code, message: string, trailers: BrowserHeaders) => {
          assert.strictEqual(code, grpc.Code.OK, "expected OK (0)");
          assert.strictEqual(message, undefined, "expected no message");
          assert.deepEqual(trailers.get("TrailerTestKey1"), ["ServerValue1"]);
          assert.deepEqual(trailers.get("TrailerTestKey2"), ["ServerValue2"]);
          assert.ok(didGetOnHeaders);
          assert.strictEqual(onMessageId, 0);
          done();
        }
      });
    });

    it("should report status code for error with headers + trailers", (done) => {
      let didGetOnHeaders = false;
      let didGetOnMessage = false;

      const ping = new PingRequest();
      ping.setFailureType(PingRequest.FailureType.CODE);
      ping.setErrorCodeReturned(12);

      grpc.invoke(TestService.PingError, {
        debug: DEBUG,
        request: ping,
        host: validHostUrl,
        onHeaders: (headers: BrowserHeaders) => {
          didGetOnHeaders = true;
        },
        onMessage: (message: Empty) => {
          didGetOnMessage = true;
        },
        onEnd: (code: grpc.Code, message: string, trailers: BrowserHeaders) => {
          assert.deepEqual(trailers.get("grpc-status"), ["12"]);
          assert.deepEqual(trailers.get("grpc-message"), ["Intentionally returning error for PingError"]);
          assert.strictEqual(code, grpc.Code.Unimplemented);
          assert.strictEqual(message, "Intentionally returning error for PingError");
          assert.ok(didGetOnHeaders);
          assert.ok(!didGetOnMessage);
          done();
        }
      });
    });

    it("should report failure for a CORS failure", (done) => {
      let didGetOnHeaders = false;
      let didGetOnMessage = false;

      const ping = new PingRequest();

      grpc.invoke(FailService.NonExistant, { // The test server hasn't registered this service, so it should fail CORS
        debug: DEBUG,
        request: ping,
        // This test is actually calling the same server as the other tests, but the server should reject the OPTIONS call
        // because the service isn't registered. This could be the same host as all other tests (that should be CORS
        // requests because they differ by port from the page the tests are run from), but IE treats different ports on
        // the same host as the same origin, so this request has to be made to a different host to trigger CORS behaviour.
        host: corsHostUrl,
        onHeaders: (headers: BrowserHeaders) => {
          didGetOnHeaders = true;
        },
        onMessage: (message: Empty) => {
          didGetOnMessage = true;
        },
        onEnd: (code: grpc.Code, message: string, trailers: BrowserHeaders) => {
          // Some browsers return empty Headers for failed requests
          console.log("code", code, "message", message, "trailers", trailers);
          assert.strictEqual(message, "Response closed without headers");
          assert.strictEqual(code, grpc.Code.Internal);
          assert.ok(!didGetOnMessage);
          done();
        }
      });
    });

    it("should report failure for a dropped response after headers", (done) => {
      let didGetOnHeaders = false;
      let didGetOnMessage = false;

      const ping = new PingRequest();
      ping.setFailureType(PingRequest.FailureType.DROP);

      grpc.invoke(TestService.PingError, {
        debug: DEBUG,
        request: ping,
        host: validHostUrl,
        onHeaders: (headers: BrowserHeaders) => {
          didGetOnHeaders = true;
          assert.deepEqual(headers.get("grpc-status"), []);
          assert.deepEqual(headers.get("grpc-message"), []);
        },
        onMessage: (message: Empty) => {
          didGetOnMessage = true;
        },
        onEnd: (code: grpc.Code, message: string, trailers: BrowserHeaders) => {
          assert.strictEqual(message, "Response closed without grpc-status (Headers only)");
          assert.strictEqual(code, grpc.Code.Internal);
          assert.ok(!didGetOnMessage);
          done();
        }
      });
    });

    it("should report failure for a request to an invalid host", (done) => {
      let didGetOnHeaders = false;
      let didGetOnMessage = false;

      const ping = new PingRequest();
      ping.setFailureType(PingRequest.FailureType.DROP);

      grpc.invoke(TestService.Ping, {
        debug: DEBUG,
        request: ping,
        host: unavailableHost, // Should not be available
        onHeaders: (headers: BrowserHeaders) => {
          didGetOnHeaders = true;
        },
        onMessage: (message: Empty) => {
          didGetOnMessage = true;
        },
        onEnd: (code: grpc.Code, message: string, trailers: BrowserHeaders) => {
          assert.strictEqual(message, "Response closed without headers");
          assert.strictEqual(code, grpc.Code.Internal);
          assert.ok(!didGetOnMessage);
          done();
        }
      });
    });

    it("should report failure for a trailers-only response", (done) => {
      let didGetOnHeaders = false;
      let didGetOnMessage = false;

      const ping = new PingRequest();

      grpc.invoke(FailService.NonExistant, { // The test server hasn't registered this service, so it should return an error
        debug: DEBUG,
        request: ping,
        host: emptyHost,
        onHeaders: (headers: BrowserHeaders) => {
          didGetOnHeaders = true;
          assert.deepEqual(headers.get("grpc-status"), ["12"]);
          assert.deepEqual(headers.get("grpc-message"), ["unknown service improbable.grpcweb.test.FailService"]);
        },
        onMessage: (message: Empty) => {
          didGetOnMessage = true;
        },
        onEnd: (code: grpc.Code, message: string, trailers: BrowserHeaders) => {
          assert.strictEqual(message, "unknown service improbable.grpcweb.test.FailService");
          assert.strictEqual(code, 12);
          assert.deepEqual(trailers.get("grpc-status"), []);
          assert.deepEqual(trailers.get("grpc-message"), []);
          assert.ok(didGetOnHeaders);
          assert.ok(!didGetOnMessage);
          done();
        }
      });
    });
  });

  describe("unary", () => {
    it("should make a unary request", (done) => {
      const ping = new PingRequest();
      ping.setValue("hello world");

      grpc.unary(TestService.Ping, {
        debug: DEBUG,
        request: ping,
        host: validHostUrl,
        onEnd: ({code, message, headers, res, trailers}) => {
          DEBUG && console.debug("code", code, "message", message, "headers", headers, "res", res, "trailers", trailers);
          assert.strictEqual(code, grpc.Code.OK, "expected OK (0)");
          assert.strictEqual(message, undefined, "expected no message");
          assert.deepEqual(headers.get("HeaderTestKey1"), ["ServerValue1"]);
          assert.deepEqual(headers.get("HeaderTestKey2"), ["ServerValue2"]);
          assert.ok(res instanceof PingResponse);
          const asPingResponse: PingResponse = res as PingResponse;
          assert.deepEqual(asPingResponse.getValue(), "hello world");
          assert.deepEqual(asPingResponse.getCounter(), 252);
          assert.deepEqual(trailers.get("TrailerTestKey1"), ["ServerValue1"]);
          assert.deepEqual(trailers.get("TrailerTestKey2"), ["ServerValue2"]);
          done();
        }
      });
    });

    it("should make a unary request with metadata", (done) => {
      const ping = new PingRequest();
      ping.setValue("hello world");
      ping.setCheckMetadata(true);

      grpc.unary(TestService.Ping, {
        debug: DEBUG,
        request: ping,
        metadata: new BrowserHeaders({"HeaderTestKey1": "ClientValue1"}),
        host: validHostUrl,
        onEnd: ({code, message, headers, res, trailers}) => {
          DEBUG && console.debug("code", code, "message", message, "headers", headers, "res", res, "trailers", trailers);
          assert.strictEqual(code, grpc.Code.OK, "expected OK (0)");
          assert.strictEqual(message, undefined, "expected no message");
          assert.deepEqual(headers.get("HeaderTestKey1"), ["ServerValue1"]);
          assert.deepEqual(headers.get("HeaderTestKey2"), ["ServerValue2"]);
          assert.ok(res instanceof PingResponse);
          const asPingResponse: PingResponse = res as PingResponse;
          assert.deepEqual(asPingResponse.getValue(), "hello world");
          assert.deepEqual(asPingResponse.getCounter(), 252);
          assert.deepEqual(trailers.get("TrailerTestKey1"), ["ServerValue1"]);
          assert.deepEqual(trailers.get("TrailerTestKey2"), ["ServerValue2"]);
          done();
        }
      });
    });

    it("should report status code for error with headers + trailers", (done) => {
      const ping = new PingRequest();
      ping.setFailureType(PingRequest.FailureType.CODE);
      ping.setErrorCodeReturned(12);

      grpc.unary(TestService.PingError, {
        debug: DEBUG,
        request: ping,
        host: validHostUrl,
        onEnd: ({code, message, headers, res, trailers}) => {
          DEBUG && console.debug("code", code, "message", message, "headers", headers, "res", res, "trailers", trailers);
          assert.strictEqual(code, grpc.Code.Unimplemented);
          assert.strictEqual(message, "Intentionally returning error for PingError");
          assert.deepEqual(headers.get("HeaderTestKey1"), ["ServerValue1"]);
          assert.deepEqual(headers.get("HeaderTestKey2"), ["ServerValue2"]);
          assert.isNull(res);
          assert.deepEqual(trailers.get("grpc-status"), ["12"]);
          assert.deepEqual(trailers.get("grpc-message"), ["Intentionally returning error for PingError"]);
          done();
        }
      });
    });

    it("should report failure for a CORS failure", (done) => {
      let didGetOnHeaders = false;
      let didGetOnMessage = false;

      const ping = new PingRequest();

      grpc.unary(FailService.NonExistant, { // The test server hasn't registered this service, so it should fail CORS
        debug: DEBUG,
        request: ping,
        // This test is actually calling the same server as the other tests, but the server should reject the OPTIONS call
        // because the service isn't registered. This could be the same host as all other tests (that should be CORS
        // requests because they differ by port from the page the tests are run from), but IE treats different ports on
        // the same host as the same origin, so this request has to be made to a different host to trigger CORS behaviour.
        host: corsHostUrl,
        onEnd: ({code, message, headers, res, trailers}) => {
          DEBUG && console.debug("code", code, "message", message, "headers", headers, "res", res, "trailers", trailers);
          // Some browsers return empty Headers for failed requests
          assert.strictEqual(message, "Response closed without headers");
          assert.strictEqual(code, grpc.Code.Internal);
          assert.ok(!didGetOnMessage);
          done();
        }
      });
    });

    it("should report failure for a dropped response after headers", (done) => {
      const ping = new PingRequest();
      ping.setFailureType(PingRequest.FailureType.DROP);

      grpc.unary(TestService.PingError, {
        debug: DEBUG,
        request: ping,
        host: validHostUrl,
        onEnd: ({code, message, headers, res, trailers}) => {
          DEBUG && console.debug("code", code, "message", message, "headers", headers, "res", res, "trailers", trailers);
          assert.strictEqual(message, "Response closed without grpc-status (Headers only)");
          assert.strictEqual(code, grpc.Code.Internal);
          assert.deepEqual(headers.get("grpc-status"), []);
          assert.deepEqual(headers.get("grpc-message"), []);
          done();
        }
      });
    });

    it("should report failure for a request to an invalid host", (done) => {
      const ping = new PingRequest();
      ping.setFailureType(PingRequest.FailureType.DROP);

      grpc.unary(TestService.Ping, {
        debug: DEBUG,
        request: ping,
        host: unavailableHost, // Should not be available
        onEnd: ({code, message, headers, res, trailers}) => {
          DEBUG && console.debug("code", code, "message", message, "headers", headers, "res", res, "trailers", trailers);
          assert.strictEqual(message, "Response closed without headers");
          assert.strictEqual(code, grpc.Code.Internal);
          assert.isNull(res);
          done();
        }
      });
    });

    it("should report failure for a trailers-only response", (done) => {
      const ping = new PingRequest();

      grpc.unary(FailService.NonExistant, { // The test server hasn't registered this service, so it should return an error
        debug: DEBUG,
        request: ping,
        host: emptyHost,
        onEnd: ({code, message, headers, res, trailers}) => {
          DEBUG && console.debug("code", code, "message", message, "headers", headers, "res", res, "trailers", trailers);
          assert.strictEqual(message, "unknown service improbable.grpcweb.test.FailService");
          assert.strictEqual(code, 12);
          assert.isNull(res);
          assert.deepEqual(headers.get("grpc-status"), ["12"]);
          assert.deepEqual(headers.get("grpc-message"), ["unknown service improbable.grpcweb.test.FailService"]);
          assert.deepEqual(trailers.get("grpc-status"), []);
          assert.deepEqual(trailers.get("grpc-message"), []);
          done();
        }
      });
    });
  });
});
