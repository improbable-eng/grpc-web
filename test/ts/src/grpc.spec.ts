// Polyfills
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
import {
  Empty,
} from "google-protobuf/google/protobuf/empty_pb";
import {
  PingRequest,
  PingResponse,
} from "../_proto/improbable/grpcweb/test/test_pb";
import {
  TestService,
  FailService,
} from "./services";
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
  it("should make a unary request", (done) => {
    let didGetOnHeaders = false;
    let didGetOnMessage = false;

    const ping = new PingRequest();
    ping.setValue("hello world");

    grpc.invoke(TestService.Ping, {
      debug: DEBUG,
      request: ping,
      host: validHostUrl,
      onHeaders: function(headers: BrowserHeaders) {
        didGetOnHeaders = true;
        assert.deepEqual(headers.get("HeaderTestKey1"), ["Value1"]);
        assert.deepEqual(headers.get("HeaderTestKey2"), ["Value2"]);
      },
      onMessage: function(message: PingResponse) {
        didGetOnMessage = true;
        assert.ok(message instanceof PingResponse);
        assert.deepEqual(message.getValue(), "hello world");
        assert.deepEqual(message.getCounter(), 252);
      },
      onComplete: function(code: grpc.Code, msg: string | undefined, trailers: BrowserHeaders) {
        DEBUG && console.log("code", code, "msg", msg);
        assert.strictEqual(code, grpc.Code.OK, "expected OK (0)");
        assert.strictEqual(msg, undefined, "expected no message");
        assert.deepEqual(trailers.get("TrailerTestKey1"), ["Value1"]);
        assert.deepEqual(trailers.get("TrailerTestKey2"), ["Value2"]);
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
      onHeaders: function(headers: BrowserHeaders) {
        didGetOnHeaders = true;
        assert.deepEqual(headers.get("HeaderTestKey1"), ["Value1"]);
        assert.deepEqual(headers.get("HeaderTestKey2"), ["Value2"]);
      },
      onMessage: function(message: PingResponse) {
        assert.ok(message instanceof PingResponse);
        assert.strictEqual(message.getCounter(), onMessageId++);
      },
      onComplete: function(code: grpc.Code, msg: string | undefined, trailers: BrowserHeaders) {
        assert.strictEqual(code, grpc.Code.OK, "expected OK (0)");
        assert.strictEqual(msg, undefined, "expected no message");
        assert.deepEqual(trailers.get("TrailerTestKey1"), ["Value1"]);
        assert.deepEqual(trailers.get("TrailerTestKey2"), ["Value2"]);
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
      onHeaders: function(headers: BrowserHeaders) {
        didGetOnHeaders = true;
        assert.deepEqual(headers.get("HeaderTestKey1"), ["Value1"]);
        assert.deepEqual(headers.get("HeaderTestKey2"), ["Value2"]);
      },
      onMessage: function(message: PingResponse) {
        assert.ok(message instanceof PingResponse);
        assert.strictEqual(message.getCounter(), onMessageId++);
      },
      onComplete: function(code: grpc.Code, msg: string | undefined, trailers: BrowserHeaders) {
        assert.strictEqual(code, grpc.Code.OK, "expected OK (0)");
        assert.strictEqual(msg, undefined, "expected no message");
        assert.deepEqual(trailers.get("TrailerTestKey1"), ["Value1"]);
        assert.deepEqual(trailers.get("TrailerTestKey2"), ["Value2"]);
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
      onHeaders: function(headers: BrowserHeaders) {
        didGetOnHeaders = true;
      },
      onMessage: function(message: Empty) {
        didGetOnMessage = true;
        assert.ok(message instanceof Empty);
      },
      onComplete: function(code: grpc.Code, msg: string, trailers: BrowserHeaders) {
        assert.deepEqual(trailers.get("grpc-status"), ["12"]);
        assert.deepEqual(trailers.get("grpc-message"), ["Intentionally returning error for PingError"]);
        assert.strictEqual(code, grpc.Code.Unimplemented);
        assert.strictEqual(msg, "Intentionally returning error for PingError");
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
      onHeaders: function(headers: BrowserHeaders) {
        didGetOnHeaders = true;
      },
      onMessage: function(message: Empty) {
        didGetOnMessage = true;
        assert.ok(message instanceof Empty);
      },
      onComplete: function(code: grpc.Code, msg: string, trailers: BrowserHeaders) {
        // Some browsers return empty Headers for failed requests
        console.log("code",code,"msg",msg,"trailers",trailers);
        if (didGetOnHeaders) {
          assert.strictEqual(msg, "Response closed without grpc-status (Headers only)");
        } else {
          assert.strictEqual(msg, "");
        }
        assert.strictEqual(code, grpc.Code.Unknown);
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
      onHeaders: function (headers: BrowserHeaders) {
        didGetOnHeaders = true;
        assert.deepEqual(headers.get("grpc-status"), []);
        assert.deepEqual(headers.get("grpc-message"), []);
      },
      onMessage: function (message: Empty) {
        didGetOnMessage = true;
        assert.ok(message instanceof Empty);
      },
      onComplete: function (code: grpc.Code, msg: string, trailers: BrowserHeaders) {
        // Some browsers return empty Headers for failed requests
        if (didGetOnHeaders) {
          assert.strictEqual(msg, "Response closed without grpc-status (Headers only)");
        } else {
          assert.strictEqual(msg, "Response closed without grpc-status (No headers)");
        }
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
      onHeaders: function (headers: BrowserHeaders) {
        didGetOnHeaders = true;
      },
      onMessage: function (message: Empty) {
        didGetOnMessage = true;
        assert.ok(message instanceof Empty);
      },
      onComplete: function (code: grpc.Code, msg: string, trailers: BrowserHeaders) {
        // Some browsers return empty Headers for failed requests
        if (didGetOnHeaders) {
          assert.strictEqual(msg, "Response closed without grpc-status (Headers only)");
        } else {
          assert.strictEqual(msg, "");
        }
        assert.strictEqual(code, grpc.Code.Unknown);
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
      onHeaders: function (headers: BrowserHeaders) {
        didGetOnHeaders = true;
        assert.deepEqual(headers.get("grpc-status"), ["12"]);
        assert.deepEqual(headers.get("grpc-message"), ["unknown service improbable.grpcweb.test.FailService"]);
      },
      onMessage: function (message: Empty) {
        didGetOnMessage = true;
        assert.ok(message instanceof Empty);
      },
      onComplete: function (code: grpc.Code, msg: string, trailers: BrowserHeaders) {
        assert.strictEqual(msg, "unknown service improbable.grpcweb.test.FailService");
        assert.strictEqual(code, 12);
        assert.deepEqual(trailers.get("grpc-status"), ["12"]);
        assert.deepEqual(trailers.get("grpc-message"), ["unknown service improbable.grpcweb.test.FailService"]);
        assert.ok(didGetOnHeaders);
        assert.ok(!didGetOnMessage);
        done();
      }
    });
  });
});
