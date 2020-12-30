// gRPC-Web library
import {
  grpc,
} from "@improbable-eng/grpc-web";

import { debug } from "../../../client/grpc-web/src/debug";
import { assert } from "chai";

// Generated Test Classes
import {
  Empty,
} from "google-protobuf/google/protobuf/empty_pb";
import {
  PingRequest,
  PingResponse,
} from "../_proto/improbable/grpcweb/test/test_pb";
import { FailService, TestService } from "../_proto/improbable/grpcweb/test/test_pb_service";
import { DEBUG, continueStream, UncaughtExceptionListener, DISABLE_CORS_TESTS } from "./util";
import {
  headerTrailerCombos, runWithHttp1AndHttp2, runWithSupportedTransports
} from "./testRpcCombinations";

describe("invoke", () => {
  runWithHttp1AndHttp2(({ testHostUrl, corsHostUrl, unavailableHost, emptyHost }) => {
    runWithSupportedTransports(transport => {
      it(`should reject a client-streaming method`, () => {
        const ping = new PingRequest();
        ping.setValue("hello world");

        assert.throw(() => {
          grpc.invoke(TestService.PingStream, {
            debug: DEBUG,
            transport: transport,
            request: ping,
            host: testHostUrl,
            onHeaders: (headers: grpc.Metadata) => {
              DEBUG && debug("headers", headers);
            },
            onMessage: (message: PingResponse) => {
              DEBUG && debug("message", message);
            },
            onEnd: (status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
              DEBUG && debug("status", status, "statusMessage", statusMessage);
            }
          })
        }, ".invoke cannot be used with client-streaming methods. Use .client instead.");
      });

      headerTrailerCombos((withHeaders, withTrailers) => {
        it("should make a unary request", (done) => {
          let didGetOnHeaders = false;
          let didGetOnMessage = false;

          const ping = new PingRequest();
          ping.setValue("hello world");
          ping.setSendHeaders(withHeaders);
          ping.setSendTrailers(withTrailers);

          grpc.invoke(TestService.Ping, {
            debug: DEBUG,
            transport: transport,
            request: ping,
            host: testHostUrl,
            onHeaders: (headers: grpc.Metadata) => {
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
            onEnd: (status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
              DEBUG && debug("status", status, "statusMessage", statusMessage);
              assert.strictEqual(status, grpc.Code.OK, "expected OK (0)");
              assert.isNotOk(statusMessage, "expected no message");
              if (withTrailers) {
                assert.deepEqual(trailers.get("TrailerTestKey1"), ["ServerValue1"]);
                assert.deepEqual(trailers.get("TrailerTestKey2"), ["ServerValue2"]);
              }
              assert.ok(didGetOnHeaders);
              assert.ok(didGetOnMessage);
              done();
            }
          });
        }, 10000);
      });

      headerTrailerCombos((withHeaders, withTrailers) => {
        it("should make a unary request with metadata", (done) => {
          let didGetOnHeaders = false;
          let didGetOnMessage = false;

          const ping = new PingRequest();
          ping.setValue("hello world");
          ping.setCheckMetadata(true);
          ping.setSendHeaders(withHeaders);
          ping.setSendTrailers(withTrailers);

          grpc.invoke(TestService.Ping, {
            debug: DEBUG,
            transport: transport,
            request: ping,
            metadata: new grpc.Metadata({
              "HeaderTestKey1": "ClientValue1",
              "HeaderTestKey2": "ClientValue2",
            }),
            host: testHostUrl,
            onHeaders: (headers: grpc.Metadata) => {
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
            onEnd: (status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
              DEBUG && debug("status", status, "statusMessage", statusMessage, "trailers", trailers);
              assert.strictEqual(status, grpc.Code.OK, "expected OK (0)");
              assert.isNotOk(statusMessage, "expected no message");
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

      headerTrailerCombos((withHeaders, withTrailers) => {
        it("should handle a streaming response of multiple messages", (done) => {
          let didGetOnHeaders = false;
          let onMessageId = 0;

          const ping = new PingRequest();
          ping.setValue("hello world");
          ping.setResponseCount(300);
          ping.setSendHeaders(withHeaders);
          ping.setSendTrailers(withTrailers);

          grpc.invoke(TestService.PingList, {
            debug: DEBUG,
            transport: transport,
            request: ping,
            host: testHostUrl,
            onHeaders: (headers: grpc.Metadata) => {
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
            onEnd: (status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
              DEBUG && debug("status", status, "statusMessage", statusMessage, "trailers", trailers);
              assert.strictEqual(status, grpc.Code.OK, "expected OK (0)");
              assert.isNotOk(statusMessage, "expected no message");
              if (withTrailers) {
                assert.deepEqual(trailers.get("TrailerTestKey1"), ["ServerValue1"]);
                assert.deepEqual(trailers.get("TrailerTestKey2"), ["ServerValue2"]);
              }
              assert.ok(didGetOnHeaders);
              assert.strictEqual(onMessageId, 300);
              done();
            }
          });
        });
      });

      headerTrailerCombos((withHeaders, withTrailers) => {
        it("should receive individual cadenced messages", (done) => {
          let didGetOnHeaders = false;
          let onMessageId = 0;

          const streamIdentifier = `rpc-${Math.random()}`;

          const ping = new PingRequest();
          ping.setValue("hello world");
          ping.setResponseCount(5);
          ping.setSendHeaders(withHeaders);
          ping.setSendTrailers(withTrailers);
          ping.setStreamIdentifier(streamIdentifier);

          grpc.invoke(TestService.PingList, {
            debug: DEBUG,
            transport: transport,
            request: ping,
            host: testHostUrl,
            onHeaders: (headers: grpc.Metadata) => {
              DEBUG && debug("headers", headers);
              didGetOnHeaders = true;
              if (withHeaders) {
                assert.deepEqual(headers.get("HeaderTestKey1"), ["ServerValue1"]);
                assert.deepEqual(headers.get("HeaderTestKey2"), ["ServerValue2"]);
              }
            },
            onMessage: (message: PingResponse) => {
              continueStream(testHostUrl, streamIdentifier, (status) => {
                DEBUG && debug("continueStream.status", status);
              });
              assert.ok(message instanceof PingResponse);
              assert.strictEqual(message.getCounter(), onMessageId++);
            },
            onEnd: (status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
              DEBUG && debug("status", status, "statusMessage", statusMessage, "trailers", trailers);
              assert.strictEqual(status, grpc.Code.OK, "expected OK (0)");
              assert.isNotOk(statusMessage, "expected no message");
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

      headerTrailerCombos((withHeaders, withTrailers) => {
        it("should handle a streaming response of no messages", (done) => {
          let didGetOnHeaders = false;
          let onMessageId = 0;

          const ping = new PingRequest();
          ping.setValue("hello world");
          ping.setResponseCount(0);
          ping.setSendHeaders(withHeaders);
          ping.setSendTrailers(withTrailers);

          grpc.invoke(TestService.PingList, {
            debug: DEBUG,
            transport: transport,
            request: ping,
            host: testHostUrl,
            onHeaders: (headers: grpc.Metadata) => {
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
            onEnd: (status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
              DEBUG && debug("status", status, "statusMessage", statusMessage, "trailers", trailers);
              assert.strictEqual(status, grpc.Code.OK, "expected OK (0)");
              assert.isNotOk(statusMessage, "expected no message");
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

      headerTrailerCombos((withHeaders, withTrailers) => {
        it("should report status code for error with headers + trailers", (done) => {
          let didGetOnHeaders = false;
          let didGetOnMessage = false;

          const ping = new PingRequest();
          ping.setFailureType(PingRequest.FailureType.CODE);
          ping.setErrorCodeReturned(12);
          ping.setSendHeaders(withHeaders);
          ping.setSendTrailers(withTrailers);

          grpc.invoke(TestService.PingError, {
            debug: DEBUG,
            transport: transport,
            request: ping,
            host: testHostUrl,
            onHeaders: (headers: grpc.Metadata) => {
              DEBUG && debug("headers", headers);
              didGetOnHeaders = true;
            },
            onMessage: (message: Empty) => {
              didGetOnMessage = true;
            },
            onEnd: (status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
              DEBUG && debug("status", status, "statusMessage", statusMessage, "trailers", trailers);
              assert.deepEqual(trailers.get("grpc-status"), ["12"]);
              assert.deepEqual(trailers.get("grpc-message"), ["Intentionally returning error for PingError"]);
              assert.strictEqual(status, grpc.Code.Unimplemented);
              assert.strictEqual(statusMessage, "Intentionally returning error for PingError");
              assert.ok(didGetOnHeaders);
              assert.ok(!didGetOnMessage);
              done();
            }
          });
        });
      });

      if (!DISABLE_CORS_TESTS) {
        it("should report failure for a CORS failure", (done) => {
          let didGetOnHeaders = false;
          let didGetOnMessage = false;

          const ping = new PingRequest();

          grpc.invoke(FailService.NonExistant, { // The test server hasn't registered this service, so it should fail CORS
            debug: DEBUG,
            transport: transport,
            request: ping,
            // This test is actually calling the same server as the other tests, but the server should reject the OPTIONS call
            // because the service isn't registered. This could be the same host as all other tests (that should be CORS
            // requests because they differ by port from the page the tests are run from), but IE treats different ports on
            // the same host as the same origin, so this request has to be made to a different host to trigger CORS behaviour.
            host: corsHostUrl,
            onHeaders: (headers: grpc.Metadata) => {
              DEBUG && debug("headers", headers);
              didGetOnHeaders = true;
            },
            onMessage: (message: Empty) => {
              didGetOnMessage = true;
            },
            onEnd: (status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
              DEBUG && debug("status", status, "statusMessage", statusMessage, "trailers", trailers);
              // Some browsers return empty Headers for failed requests
              assert.strictEqual(statusMessage, "Response closed without headers");
              assert.strictEqual(status, grpc.Code.Unknown);
              assert.ok(!didGetOnMessage);
              done();
            }
          });
        });
      }

      it("should report failure for a request to an invalid host", (done) => {
        let didGetOnHeaders = false;
        let didGetOnMessage = false;

        const ping = new PingRequest();

        grpc.invoke(TestService.Ping, {
          debug: DEBUG,
          transport: transport,
          request: ping,
          host: unavailableHost, // Should not be available
          onHeaders: (headers: grpc.Metadata) => {
            DEBUG && debug("headers", headers);
            didGetOnHeaders = true;
          },
          onMessage: (message: Empty) => {
            didGetOnMessage = true;
          },
          onEnd: (status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
            DEBUG && debug("status", status, "statusMessage", statusMessage, "trailers", trailers);
            assert.strictEqual(statusMessage, "Response closed without headers");
            assert.strictEqual(status, grpc.Code.Unknown);
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
          transport: transport,
          request: ping,
          host: emptyHost,
          onHeaders: (headers: grpc.Metadata) => {
            DEBUG && debug("headers", headers);
            didGetOnHeaders = true;
            assert.deepEqual(headers.get("grpc-status"), ["12"]);
            assert.deepEqual(headers.get("grpc-message"), ["unknown service improbable.grpcweb.test.FailService"]);
          },
          onMessage: (message: Empty) => {
            didGetOnMessage = true;
          },
          onEnd: (status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
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
            transport: transport,
            request: ping,
            host: testHostUrl,
            onHeaders: (headers: grpc.Metadata) => {
              throw new Error("onHeaders exception");
            },
            onMessage: (message: PingResponse) => {
              throw new Error("onMessage exception");
            },
            onEnd: (status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
              setTimeout(() => {
                uncaughtHandler.detach();
                const exceptionsCaught = uncaughtHandler.getMessages();
                assert.lengthOf(exceptionsCaught, 3);
                assert.include(exceptionsCaught[0], "onHeaders exception");
                assert.include(exceptionsCaught[1], "onMessage exception");
                assert.include(exceptionsCaught[2], "onEnd exception");
                done();
              }, 1000);
              throw new Error("onEnd exception");
            }
          });
        });
      });
    });
  });
});
