// Polyfills
import {debug} from "../../../ts/src/debug";

const global = Function('return this')();

if (typeof Uint8Array === "undefined") {
  (global as any).Uint8Array = require("typedarray").Uint8Array;
}
if (typeof ArrayBuffer === "undefined") {
  (global as any).ArrayBuffer = require("typedarray").ArrayBuffer;
}
if (typeof DataView === "undefined") {
  (global as any).DataView = require("typedarray").DataView;
}

// Test Config
import {assert} from "chai";
import {
  testHost,
  corsHost
} from "../../hosts-config";
type TestConfig = {
  testHostUrl: string,
  corsHostUrl: string,
  unavailableHost: string,
  emptyHost: string,
}
const http1Config: TestConfig = {
  testHostUrl: `https://${testHost}:9100`,
  corsHostUrl: `https://${corsHost}:9100`,
  unavailableHost: `https://${testHost}:9999`,
  emptyHost: `https://${corsHost}:9105`,
};
const http2Config: TestConfig = {
  testHostUrl: `https://${testHost}:9090`,
  corsHostUrl: `https://${corsHost}:9090`,
  unavailableHost: `https://${testHost}:9999`,
  emptyHost: `https://${corsHost}:9095`,
};
const DEBUG: boolean = (global as any).DEBUG;

// gRPC-Web library
import {
  grpc,
  Code,
  BrowserHeaders,
} from "../../../ts/src/index";
import UnaryMethodDefinition = grpc.UnaryMethodDefinition;

// Generated Test Classes
import {
  Empty,
} from "google-protobuf/google/protobuf/empty_pb";
import {
  PingRequest,
  PingResponse,
} from "../_proto/improbable/grpcweb/test/test_pb";
import {FailService, TestService} from "../_proto/improbable/grpcweb/test/test_pb_service";
import {UncaughtExceptionListener} from "./util";

function headerTrailerCombos(cb: (withHeaders: boolean, withTrailers: boolean, name: string) => void) {
  cb(false, false, " - no headers - no trailers");
  cb(true, false, " - with headers - no trailers");
  cb(false, true, " - no headers - with trailers");
  cb(true, true, " - with headers - with trailers");
}

function runTests({testHostUrl, corsHostUrl, unavailableHost, emptyHost}: TestConfig) {
  describe("invoke", () => {
    headerTrailerCombos((withHeaders, withTrailers, name) => {
      it("should make a unary request" + name, (done) => {
        let didGetOnHeaders = false;
        let didGetOnMessage = false;

        const ping = new PingRequest();
        ping.setValue("hello world");
        ping.setSendHeaders(withHeaders);
        ping.setSendTrailers(withTrailers);

        grpc.invoke(TestService.Ping, {
          debug: DEBUG,
          request: ping,
          host: testHostUrl,
          onHeaders: (headers: BrowserHeaders) => {
            DEBUG && debug("headers", headers);
            didGetOnHeaders = true;
            if (withHeaders) {
              assert.deepEqual(headers.get("HeaderTestKey1"), ["ServerValue1"]);
              assert.deepEqual(headers.get("HeaderTestKey2"), ["ServerValue2"]);
            }
          },
          onMessage: (message: PingResponse) => {
            didGetOnMessage = true;
            assert.ok(message instanceof PingResponse);
            assert.deepEqual(message.getValue(), "hello world");
            assert.deepEqual(message.getCounter(), 252);
          },
          onEnd: (status: Code, statusMessage: string, trailers: BrowserHeaders) => {
            DEBUG && debug("status", status, "statusMessage", statusMessage);
            assert.strictEqual(status, Code.OK, "expected OK (0)");
            assert.strictEqual(statusMessage, undefined, "expected no message");
            if (withTrailers) {
              assert.deepEqual(trailers.get("TrailerTestKey1"), ["ServerValue1"]);
              assert.deepEqual(trailers.get("TrailerTestKey2"), ["ServerValue2"]);
            }
            assert.ok(didGetOnHeaders);
            assert.ok(didGetOnMessage);
            done();
          }
        });
      });
    });

    headerTrailerCombos((withHeaders, withTrailers, name) => {
      it("should make a unary request with metadata" + name, (done) => {
        let didGetOnHeaders = false;
        let didGetOnMessage = false;

        const ping = new PingRequest();
        ping.setValue("hello world");
        ping.setCheckMetadata(true);
        ping.setSendHeaders(withHeaders);
        ping.setSendTrailers(withTrailers);

        grpc.invoke(TestService.Ping, {
          debug: DEBUG,
          request: ping,
          metadata: new BrowserHeaders({"HeaderTestKey1": "ClientValue1"}),
          host: testHostUrl,
          onHeaders: (headers: BrowserHeaders) => {
            DEBUG && debug("headers", headers);
            didGetOnHeaders = true;
            if (withHeaders) {
              assert.deepEqual(headers.get("HeaderTestKey1"), ["ServerValue1"]);
              assert.deepEqual(headers.get("HeaderTestKey2"), ["ServerValue2"]);
            }
          },
          onMessage: (message: PingResponse) => {
            didGetOnMessage = true;
            assert.ok(message instanceof PingResponse);
            assert.deepEqual(message.getValue(), "hello world");
            assert.deepEqual(message.getCounter(), 252);
          },
          onEnd: (status: Code, statusMessage: string, trailers: BrowserHeaders) => {
            DEBUG && debug("status", status, "statusMessage", statusMessage, "trailers", trailers);
            assert.strictEqual(status, Code.OK, "expected OK (0)");
            assert.strictEqual(statusMessage, undefined, "expected no message");
            if (withTrailers) {
              assert.deepEqual(trailers.get("TrailerTestKey1"), ["ServerValue1"]);
              assert.deepEqual(trailers.get("TrailerTestKey2"), ["ServerValue2"]);
            }
            assert.ok(didGetOnHeaders);
            assert.ok(didGetOnMessage);
            done();
          }
        });
      });
    });

    headerTrailerCombos((withHeaders, withTrailers, name) => {
      it("should handle a streaming response of multiple messages" + name, (done) => {
        let didGetOnHeaders = false;
        let onMessageId = 0;

        const ping = new PingRequest();
        ping.setValue("hello world");
        ping.setResponseCount(3000);
        ping.setSendHeaders(withHeaders);
        ping.setSendTrailers(withTrailers);

        grpc.invoke(TestService.PingList, {
          debug: DEBUG,
          request: ping,
          host: testHostUrl,
          onHeaders: (headers: BrowserHeaders) => {
            DEBUG && debug("headers", headers);
            didGetOnHeaders = true;
            if (withHeaders) {
              assert.deepEqual(headers.get("HeaderTestKey1"), ["ServerValue1"]);
              assert.deepEqual(headers.get("HeaderTestKey2"), ["ServerValue2"]);
            }
          },
          onMessage: (message: PingResponse) => {
            assert.ok(message instanceof PingResponse);
            assert.strictEqual(message.getCounter(), onMessageId++);
          },
          onEnd: (status: Code, statusMessage: string, trailers: BrowserHeaders) => {
            DEBUG && debug("status", status, "statusMessage", statusMessage, "trailers", trailers);
            assert.strictEqual(status, Code.OK, "expected OK (0)");
            assert.strictEqual(statusMessage, undefined, "expected no message");
            if (withTrailers) {
              assert.deepEqual(trailers.get("TrailerTestKey1"), ["ServerValue1"]);
              assert.deepEqual(trailers.get("TrailerTestKey2"), ["ServerValue2"]);
            }
            assert.ok(didGetOnHeaders);
            assert.strictEqual(onMessageId, 3000);
            done();
          }
        });
      });
    });

    headerTrailerCombos((withHeaders, withTrailers, name) => {
      it("should receive individual cadenced messages" + name, (done) => {
        let didGetOnHeaders = false;
        let onMessageId = 0;

        const ping = new PingRequest();
        ping.setValue("hello world");
        ping.setResponseCount(5);
        ping.setMessageLatencyMs(300);
        ping.setSendHeaders(withHeaders);
        ping.setSendTrailers(withTrailers);

        let lastMessageTime = 0;
        DEBUG && debug("lastMessageTime", lastMessageTime);

        grpc.invoke(TestService.PingList, {
          debug: DEBUG,
          request: ping,
          host: testHostUrl,
          onHeaders: (headers: BrowserHeaders) => {
            DEBUG && debug("headers", headers);
            didGetOnHeaders = true;
            if (withHeaders) {
              assert.deepEqual(headers.get("HeaderTestKey1"), ["ServerValue1"]);
              assert.deepEqual(headers.get("HeaderTestKey2"), ["ServerValue2"]);
            }
          },
          onMessage: (message: PingResponse) => {
            assert.ok(message instanceof PingResponse);
            assert.strictEqual(message.getCounter(), onMessageId++);
            const thisTime = new Date().getTime();
            if (lastMessageTime !== 0) {
              // Ignore time to first message
              const diff = thisTime - lastMessageTime;
              DEBUG && debug("diff", diff);
              DEBUG && debug("thisTime", thisTime);
              assert.isAtLeast(diff, 50);
              assert.isAtMost(diff, 1500);
            }
            lastMessageTime = thisTime;
          },
          onEnd: (status: Code, statusMessage: string, trailers: BrowserHeaders) => {
            DEBUG && debug("status", status, "statusMessage", statusMessage, "trailers", trailers);
            assert.strictEqual(status, Code.OK, "expected OK (0)");
            assert.strictEqual(statusMessage, undefined, "expected no message");
            if (withTrailers) {
              assert.deepEqual(trailers.get("TrailerTestKey1"), ["ServerValue1"]);
              assert.deepEqual(trailers.get("TrailerTestKey2"), ["ServerValue2"]);
            }
            assert.ok(didGetOnHeaders);
            assert.strictEqual(onMessageId, 5);
            done();
          }
        });
      }, 10000); // Set timeout to 10s
    });

    headerTrailerCombos((withHeaders, withTrailers, name) => {
      it("should handle a streaming response of no messages" + name, (done) => {
        let didGetOnHeaders = false;
        let onMessageId = 0;

        const ping = new PingRequest();
        ping.setValue("hello world");
        ping.setResponseCount(0);
        ping.setSendHeaders(withHeaders);
        ping.setSendTrailers(withTrailers);

        grpc.invoke(TestService.PingList, {
          debug: DEBUG,
          request: ping,
          host: testHostUrl,
          onHeaders: (headers: BrowserHeaders) => {
            DEBUG && debug("headers", headers);
            didGetOnHeaders = true;
            if (withHeaders) {
              assert.deepEqual(headers.get("HeaderTestKey1"), ["ServerValue1"]);
              assert.deepEqual(headers.get("HeaderTestKey2"), ["ServerValue2"]);
            }
          },
          onMessage: (message: PingResponse) => {
            assert.ok(message instanceof PingResponse);
            assert.strictEqual(message.getCounter(), onMessageId++);
          },
          onEnd: (status: Code, statusMessage: string, trailers: BrowserHeaders) => {
            DEBUG && debug("status", status, "statusMessage", statusMessage, "trailers", trailers);
            assert.strictEqual(status, Code.OK, "expected OK (0)");
            assert.strictEqual(statusMessage, undefined, "expected no message");
            if (withTrailers) {
              assert.deepEqual(trailers.get("TrailerTestKey1"), ["ServerValue1"]);
              assert.deepEqual(trailers.get("TrailerTestKey2"), ["ServerValue2"]);
            }
            assert.ok(didGetOnHeaders);
            assert.strictEqual(onMessageId, 0);
            done();
          }
        });
      });
    });

    headerTrailerCombos((withHeaders, withTrailers, name) => {
      it("should report status code for error with headers + trailers" + name, (done) => {
        let didGetOnHeaders = false;
        let didGetOnMessage = false;

        const ping = new PingRequest();
        ping.setFailureType(PingRequest.FailureType.CODE);
        ping.setErrorCodeReturned(12);
        ping.setSendHeaders(withHeaders);
        ping.setSendTrailers(withTrailers);

        grpc.invoke(TestService.PingError, {
          debug: DEBUG,
          request: ping,
          host: testHostUrl,
          onHeaders: (headers: BrowserHeaders) => {
            DEBUG && debug("headers", headers);
            didGetOnHeaders = true;
          },
          onMessage: (message: Empty) => {
            didGetOnMessage = true;
          },
          onEnd: (status: Code, statusMessage: string, trailers: BrowserHeaders) => {
            DEBUG && debug("status", status, "statusMessage", statusMessage, "trailers", trailers);
            assert.deepEqual(trailers.get("grpc-status"), ["12"]);
            assert.deepEqual(trailers.get("grpc-message"), ["Intentionally returning error for PingError"]);
            assert.strictEqual(status, Code.Unimplemented);
            assert.strictEqual(statusMessage, "Intentionally returning error for PingError");
            assert.ok(didGetOnHeaders);
            assert.ok(!didGetOnMessage);
            done();
          }
        });
      });
    });

    if (!process.env.DISABLE_CORS_TESTS) {
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
            DEBUG && debug("headers", headers);
            didGetOnHeaders = true;
          },
          onMessage: (message: Empty) => {
            didGetOnMessage = true;
          },
          onEnd: (status: Code, statusMessage: string, trailers: BrowserHeaders) => {
            DEBUG && debug("status", status, "statusMessage", statusMessage, "trailers", trailers);
            // Some browsers return empty Headers for failed requests
            assert.strictEqual(statusMessage, "Response closed without headers");
            assert.strictEqual(status, Code.Internal);
            assert.ok(!didGetOnMessage);
            done();
          }
        });
      });
    }

    it("should report failure for a dropped response after headers", (done) => {
      let didGetOnHeaders = false;
      let didGetOnMessage = false;

      const ping = new PingRequest();
      ping.setFailureType(PingRequest.FailureType.DROP);

      grpc.invoke(TestService.PingError, {
        debug: DEBUG,
        request: ping,
        host: testHostUrl,
        onHeaders: (headers: BrowserHeaders) => {
          DEBUG && debug("headers", headers);
          didGetOnHeaders = true;
          assert.deepEqual(headers.get("grpc-status"), []);
          assert.deepEqual(headers.get("grpc-message"), []);
        },
        onMessage: (message: Empty) => {
          didGetOnMessage = true;
        },
        onEnd: (status: Code, statusMessage: string, trailers: BrowserHeaders) => {
          DEBUG && debug("status", status, "statusMessage", statusMessage, "trailers", trailers);
          assert.strictEqual(statusMessage, "Response closed without grpc-status (Headers only)");
          assert.strictEqual(status, Code.Internal);
          assert.ok(!didGetOnMessage);
          done();
        }
      });
    });

    it("should report failure for a request to an invalid host", (done) => {
      let didGetOnHeaders = false;
      let didGetOnMessage = false;

      const ping = new PingRequest();

      grpc.invoke(TestService.Ping, {
        debug: DEBUG,
        request: ping,
        host: unavailableHost, // Should not be available
        onHeaders: (headers: BrowserHeaders) => {
          DEBUG && debug("headers", headers);
          didGetOnHeaders = true;
        },
        onMessage: (message: Empty) => {
          didGetOnMessage = true;
        },
        onEnd: (status: Code, statusMessage: string, trailers: BrowserHeaders) => {
          DEBUG && debug("status", status, "statusMessage", statusMessage, "trailers", trailers);
          assert.strictEqual(statusMessage, "Response closed without headers");
          assert.strictEqual(status, Code.Internal);
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
          DEBUG && debug("headers", headers);
          didGetOnHeaders = true;
          assert.deepEqual(headers.get("grpc-status"), ["12"]);
          assert.deepEqual(headers.get("grpc-message"), ["unknown service improbable.grpcweb.test.FailService"]);
        },
        onMessage: (message: Empty) => {
          didGetOnMessage = true;
        },
        onEnd: (status: Code, statusMessage: string, trailers: BrowserHeaders) => {
          DEBUG && debug("status", status, "statusMessage", statusMessage, "trailers", trailers);
          assert.strictEqual(statusMessage, "unknown service improbable.grpcweb.test.FailService");
          assert.strictEqual(status, 12);
          assert.deepEqual(trailers.get("grpc-status"), ["12"]);
          assert.deepEqual(trailers.get("grpc-message"), ["unknown service improbable.grpcweb.test.FailService"]);
          assert.ok(didGetOnHeaders);
          assert.ok(!didGetOnMessage);
          done();
        }
      });
    });

    describe("exception handling", () => {
      let uncaughtHandler: UncaughtExceptionListener;
      beforeEach(() => {
        uncaughtHandler = new UncaughtExceptionListener();
        uncaughtHandler.attach();
      });

      afterEach(() => {
        uncaughtHandler.detach();
      });

      it("should not suppress exceptions", (done) => {
        const ping = new PingRequest();
        ping.setValue("hello world");

        grpc.invoke(TestService.Ping, {
          debug: DEBUG,
          request: ping,
          host: testHostUrl,
          onHeaders: (headers: BrowserHeaders) => {
            throw new Error("onHeaders exception");
          },
          onMessage: (message: PingResponse) => {
            throw new Error("onMessage exception");
          },
          onEnd: (status: Code, statusMessage: string, trailers: BrowserHeaders) => {
            setTimeout(() => {
              uncaughtHandler.detach();
              const exceptionsCaught = uncaughtHandler.getMessages();
              assert.lengthOf(exceptionsCaught, 3);
              assert.include(exceptionsCaught[0], "onHeaders exception");
              assert.include(exceptionsCaught[1], "onMessage exception");
              assert.include(exceptionsCaught[2], "onEnd exception");
              done();
            }, 100);
            throw new Error("onEnd exception");
          }
        });
      });
    });
  });

  describe("unary", () => {
    it("should reject a streaming method", () => {
      const ping = new PingRequest();
      ping.setValue("hello world");

      assert.throw(() => {
          grpc.unary(TestService.PingList as any as UnaryMethodDefinition<PingRequest, PingResponse>, {
            debug: DEBUG,
            request: ping,
            host: testHostUrl,
            onEnd: ({status, statusMessage, headers, message, trailers}) => {
              DEBUG && debug("status", status, "statusMessage", statusMessage, "headers", headers, "res", message, "trailers", trailers);
            }
          })
        }, ".unary cannot be used with server-streaming methods. Use .invoke instead."
      );
    });

    headerTrailerCombos((withHeaders, withTrailers, name) => {
      it("should make a unary request" + name, (done) => {
        const ping = new PingRequest();
        ping.setValue("hello world");
        ping.setSendHeaders(withHeaders);
        ping.setSendTrailers(withTrailers);

        grpc.unary(TestService.Ping, {
          debug: DEBUG,
          request: ping,
          host: testHostUrl,
          onEnd: ({status, statusMessage, headers, message, trailers}) => {
            DEBUG && debug("status", status, "statusMessage", statusMessage, "headers", headers, "res", message, "trailers", trailers);
            assert.strictEqual(status, Code.OK, "expected OK (0)");
            assert.strictEqual(statusMessage, undefined, "expected no message");
            if (withHeaders) {
              assert.deepEqual(headers.get("HeaderTestKey1"), ["ServerValue1"]);
              assert.deepEqual(headers.get("HeaderTestKey2"), ["ServerValue2"]);
            }
            assert.ok(message instanceof PingResponse);
            const asPingResponse: PingResponse = message as PingResponse;
            assert.deepEqual(asPingResponse.getValue(), "hello world");
            assert.deepEqual(asPingResponse.getCounter(), 252);
            if (withTrailers) {
              assert.deepEqual(trailers.get("TrailerTestKey1"), ["ServerValue1"]);
              assert.deepEqual(trailers.get("TrailerTestKey2"), ["ServerValue2"]);
            }
            done();
          }
        });
      });
    });

    headerTrailerCombos((withHeaders, withTrailers, name) => {
      it("should make a unary request with metadata" + name, (done) => {
        const ping = new PingRequest();
        ping.setValue("hello world");
        ping.setCheckMetadata(true);
        ping.setSendHeaders(withHeaders);
        ping.setSendTrailers(withTrailers);

        grpc.unary(TestService.Ping, {
          debug: DEBUG,
          request: ping,
          metadata: new BrowserHeaders({"HeaderTestKey1": "ClientValue1"}),
          host: testHostUrl,
          onEnd: ({status, statusMessage, headers, message, trailers}) => {
            DEBUG && debug("status", status, "statusMessage", statusMessage, "headers", headers, "res", message, "trailers", trailers);
            assert.strictEqual(status, Code.OK, "expected OK (0)");
            assert.strictEqual(statusMessage, undefined, "expected no message");
            if (withHeaders) {
              assert.deepEqual(headers.get("HeaderTestKey1"), ["ServerValue1"]);
              assert.deepEqual(headers.get("HeaderTestKey2"), ["ServerValue2"]);
            }
            assert.ok(message instanceof PingResponse);
            const asPingResponse: PingResponse = message as PingResponse;
            assert.deepEqual(asPingResponse.getValue(), "hello world");
            assert.deepEqual(asPingResponse.getCounter(), 252);
            if (withTrailers) {
              assert.deepEqual(trailers.get("TrailerTestKey1"), ["ServerValue1"]);
              assert.deepEqual(trailers.get("TrailerTestKey2"), ["ServerValue2"]);
            }
            done();
          }
        });
      });
    });

    headerTrailerCombos((withHeaders, withTrailers, name) => {
      it("should report status code for error with headers + trailers" + name, (done) => {
        const ping = new PingRequest();
        ping.setFailureType(PingRequest.FailureType.CODE);
        ping.setErrorCodeReturned(12);
        ping.setSendHeaders(withHeaders);
        ping.setSendTrailers(withTrailers);

        grpc.unary(TestService.PingError, {
          debug: DEBUG,
          request: ping,
          host: testHostUrl,
          onEnd: ({status, statusMessage, headers, message, trailers}) => {
            DEBUG && debug("status", status, "statusMessage", statusMessage, "headers", headers, "res", message, "trailers", trailers);
            assert.strictEqual(status, Code.Unimplemented);
            assert.strictEqual(statusMessage, "Intentionally returning error for PingError");
            if (withHeaders) {
              assert.deepEqual(headers.get("HeaderTestKey1"), ["ServerValue1"]);
              assert.deepEqual(headers.get("HeaderTestKey2"), ["ServerValue2"]);
            }
            assert.isNull(message);
            assert.deepEqual(trailers.get("grpc-status"), ["12"]);
            assert.deepEqual(trailers.get("grpc-message"), ["Intentionally returning error for PingError"]);
            if (withTrailers) {
              assert.deepEqual(trailers.get("TrailerTestKey1"), ["ServerValue1"]);
              assert.deepEqual(trailers.get("TrailerTestKey2"), ["ServerValue2"]);
            }
            done();
          }
        });
      });
    });

    if (!process.env.DISABLE_CORS_TESTS) {
      it("should report failure for a CORS failure", (done) => {
        const ping = new PingRequest();

        grpc.unary(FailService.NonExistant, { // The test server hasn't registered this service, so it should fail CORS
          debug: DEBUG,
          request: ping,
          // This test is actually calling the same server as the other tests, but the server should reject the OPTIONS call
          // because the service isn't registered. This could be the same host as all other tests (that should be CORS
          // requests because they differ by port from the page the tests are run from), but IE treats different ports on
          // the same host as the same origin, so this request has to be made to a different host to trigger CORS behaviour.
          host: corsHostUrl,
          onEnd: ({status, statusMessage, headers, message, trailers}) => {
            DEBUG && debug("status", status, "statusMessage", statusMessage, "headers", headers, "res", message, "trailers", trailers);
            // Some browsers return empty Headers for failed requests
            assert.strictEqual(statusMessage, "Response closed without headers");
            assert.strictEqual(status, Code.Internal);
            done();
          }
        });
      });
    }

    it("should report failure for a dropped response after headers", (done) => {
      const ping = new PingRequest();
      ping.setFailureType(PingRequest.FailureType.DROP);

      grpc.unary(TestService.PingError, {
        debug: DEBUG,
        request: ping,
        host: testHostUrl,
        onEnd: ({status, statusMessage, headers, message, trailers}) => {
          DEBUG && debug("status", status, "statusMessage", statusMessage, "headers", headers, "res", message, "trailers", trailers);
          assert.strictEqual(statusMessage, "Response closed without grpc-status (Headers only)");
          assert.strictEqual(status, Code.Internal);
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
        onEnd: ({status, statusMessage, headers, message, trailers}) => {
          DEBUG && debug("status", status, "statusMessage", statusMessage, "headers", headers, "res", message, "trailers", trailers);
          assert.strictEqual(statusMessage, "Response closed without headers");
          assert.strictEqual(status, Code.Internal);
          assert.isNull(message);
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
        onEnd: ({status, statusMessage, headers, message, trailers}) => {
          DEBUG && debug("status", status, "statusMessage", statusMessage, "headers", headers, "res", message, "trailers", trailers);
          assert.strictEqual(statusMessage, "unknown service improbable.grpcweb.test.FailService");
          assert.strictEqual(status, 12);
          assert.isNull(message);
          assert.deepEqual(headers.get("grpc-status"), ["12"]);
          assert.deepEqual(headers.get("grpc-message"), ["unknown service improbable.grpcweb.test.FailService"]);
          assert.deepEqual(trailers.get("grpc-status"), ["12"]);
          assert.deepEqual(trailers.get("grpc-message"), ["unknown service improbable.grpcweb.test.FailService"]);
          done();
        }
      });
    });

    describe("exception handling", () => {
      let uncaughtHandler: UncaughtExceptionListener;
      beforeEach(() => {
        uncaughtHandler = new UncaughtExceptionListener();
        uncaughtHandler.attach();
      });

      afterEach(() => {
        uncaughtHandler.detach();
      });

      it("should not suppress exceptions", (done) => {
        const ping = new PingRequest();
        ping.setValue("hello world");

        grpc.unary(TestService.Ping, {
          debug: DEBUG,
          request: ping,
          host: testHostUrl,
          onEnd: ({status, statusMessage, headers, message, trailers}) => {
            DEBUG && debug("status", status, "statusMessage", statusMessage, "headers", headers, "res", message, "trailers", trailers);
            setTimeout(() => {
              uncaughtHandler.detach();
              const exceptionsCaught = uncaughtHandler.getMessages();
              assert.lengthOf(exceptionsCaught, 1);
              assert.include(exceptionsCaught[0], "onEnd exception");
              done();
            }, 100);
            throw new Error("onEnd exception");
          }
        });
      });
    });
  });
}

describe("grpc-web-client", () => {
  describe("http1", () => {
    runTests(http1Config);
  });
  describe("http2", () => {
    runTests(http2Config);
  });
});
