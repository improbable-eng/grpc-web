// gRPC-Web library
import {
  grpc,
} from "@improbable-eng/grpc-web";

import { debug } from "../../../client/grpc-web/src/debug";
import { assert } from "chai";

// Generated Test Classes
import {
  PingRequest,
  PingResponse, TextMessage,
} from "../_proto/improbable/grpcweb/test/test_pb";
import { FailService, TestService } from "../_proto/improbable/grpcweb/test/test_pb_service";
import { DEBUG, DISABLE_CORS_TESTS, UncaughtExceptionListener } from "./util";
import {
  headerTrailerCombos, runWithHttp1AndHttp2, runWithSupportedTransports
} from "./testRpcCombinations";

describe("unary", () => {
  runWithHttp1AndHttp2(({ testHostUrl, corsHostUrl, unavailableHost, emptyHost }) => {
    runWithSupportedTransports(transport => {
      it(`should reject a server-streaming method`, () => {
        const ping = new PingRequest();
        ping.setValue("hello world");

        assert.throw(() => {
          grpc.unary(TestService.PingList as any as grpc.UnaryMethodDefinition<PingRequest, PingResponse>, {
            debug: DEBUG,
            transport: transport,
            request: ping,
            host: testHostUrl,
            onEnd: ({ status, statusMessage, headers, message, trailers }) => {
              DEBUG && debug("status", status, "statusMessage", statusMessage, "headers", headers, "res", message, "trailers", trailers);
            }
          })
        }, ".unary cannot be used with server-streaming methods. Use .invoke or .client instead.");
      });

      it(`should reject a client-streaming method`, () => {
        const ping = new PingRequest();
        ping.setValue("hello world");

        assert.throw(() => {
          grpc.unary(TestService.PingStream as any as grpc.UnaryMethodDefinition<PingRequest, PingResponse>, {
            debug: DEBUG,
            transport: transport,
            request: ping,
            host: testHostUrl,
            onEnd: ({ status, statusMessage, headers, message, trailers }) => {
              DEBUG && debug("status", status, "statusMessage", statusMessage, "headers", headers, "res", message, "trailers", trailers);
            }
          })
        }, ".unary cannot be used with client-streaming methods. Use .client instead.");
      });

      headerTrailerCombos((withHeaders, withTrailers) => {
        it(`should make a unary request`, (done) => {
          const ping = new PingRequest();
          ping.setValue("hello world");
          ping.setSendHeaders(withHeaders);
          ping.setSendTrailers(withTrailers);

          grpc.unary(TestService.Ping, {
            debug: DEBUG,
            transport: transport,
            request: ping,
            host: testHostUrl,
            onEnd: ({ status, statusMessage, headers, message, trailers }) => {
              DEBUG && debug("status", status, "statusMessage", statusMessage, "headers", headers, "res", message, "trailers", trailers);
              assert.strictEqual(status, grpc.Code.OK, "expected OK (0)");
              assert.isNotOk(statusMessage, "expected no message");
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

      headerTrailerCombos((withHeaders, withTrailers) => {
        it(`should make a large unary request`, (done) => {
          let text = "";
          const iterations = 1024;
          for (let i = 0; i < iterations; i++) {
            text += "0123456789ABCDEF";
          }
          assert.equal(text.length, 16384, "generated message length");

          const textMessage = new TextMessage();
          textMessage.setText(text);
          textMessage.setSendHeaders(withHeaders);
          textMessage.setSendTrailers(withTrailers);

          grpc.unary(TestService.Echo, {
            debug: DEBUG,
            transport: transport,
            request: textMessage,
            host: testHostUrl,
            onEnd: ({ status, statusMessage, headers, message, trailers }) => {
              DEBUG && debug("status", status, "statusMessage", statusMessage, "headers", headers, "res", message, "trailers", trailers);
              assert.strictEqual(status, grpc.Code.OK, "expected OK (0)");
              assert.isNotOk(statusMessage, "expected no message");
              if (withHeaders) {
                assert.deepEqual(headers.get("HeaderTestKey1"), ["ServerValue1"]);
                assert.deepEqual(headers.get("HeaderTestKey2"), ["ServerValue2"]);
              }
              assert.ok(message instanceof TextMessage);
              const asTextMessage: TextMessage = message as TextMessage;
              assert.equal(asTextMessage.getText().length, 16384, "response message length");
              if (withTrailers) {
                assert.deepEqual(trailers.get("TrailerTestKey1"), ["ServerValue1"]);
                assert.deepEqual(trailers.get("TrailerTestKey2"), ["ServerValue2"]);
              }
              done();
            }
          });
        }, 20000); // 20s timeout
      });

      headerTrailerCombos((withHeaders, withTrailers) => {
        it(`should make a unary request with metadata`, (done) => {
          const ping = new PingRequest();
          ping.setValue("hello world");
          ping.setCheckMetadata(true);
          ping.setSendHeaders(withHeaders);
          ping.setSendTrailers(withTrailers);

          grpc.unary(TestService.Ping, {
            debug: DEBUG,
            transport: transport,
            request: ping,
            metadata: new grpc.Metadata({
              "HeaderTestKey1": "ClientValue1",
              "HeaderTestKey2": "ClientValue2",
            }),
            host: testHostUrl,
            onEnd: ({ status, statusMessage, headers, message, trailers }) => {
              DEBUG && debug("status", status, "statusMessage", statusMessage, "headers", headers, "res", message, "trailers", trailers);
              assert.strictEqual(status, grpc.Code.OK, "expected OK (0)");
              assert.isNotOk(statusMessage, "expected no message");
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

      headerTrailerCombos((withHeaders, withTrailers) => {
        it(`should report status code for error with headers + trailers`, (done) => {
          const ping = new PingRequest();
          ping.setFailureType(PingRequest.FailureType.CODE);
          ping.setErrorCodeReturned(12);
          ping.setSendHeaders(withHeaders);
          ping.setSendTrailers(withTrailers);

          grpc.unary(TestService.PingError, {
            debug: DEBUG,
            transport: transport,
            request: ping,
            host: testHostUrl,
            onEnd: ({ status, statusMessage, headers, message, trailers }) => {
              DEBUG && debug("status", status, "statusMessage", statusMessage, "headers", headers, "res", message, "trailers", trailers);
              assert.strictEqual(status, grpc.Code.Unimplemented);
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

      if (!DISABLE_CORS_TESTS) {
        it(`should report failure for a CORS failure`, (done) => {
          const ping = new PingRequest();

          grpc.unary(FailService.NonExistant, { // The test server hasn't registered this service, so it should fail CORS
            debug: DEBUG,
            transport: transport,
            request: ping,
            // This test is actually calling the same server as the other tests, but the server should reject the OPTIONS call
            // because the service isn't registered. This could be the same host as all other tests (that should be CORS
            // requests because they differ by port from the page the tests are run from), but IE treats different ports on
            // the same host as the same origin, so this request has to be made to a different host to trigger CORS behaviour.
            host: corsHostUrl,
            onEnd: ({ status, statusMessage, headers, message, trailers }) => {
              DEBUG && debug("status", status, "statusMessage", statusMessage, "headers", headers, "res", message, "trailers", trailers);
              // Some browsers return empty Headers for failed requests
              assert.strictEqual(statusMessage, "Response closed without headers");
              assert.strictEqual(status, grpc.Code.Unknown);
              done();
            }
          });
        });
      }

      it(`should report failure for a request to an invalid host`, (done) => {
        const ping = new PingRequest();

        grpc.unary(TestService.Ping, {
          debug: DEBUG,
          transport: transport,
          request: ping,
          host: unavailableHost, // Should not be available
          onEnd: ({ status, statusMessage, headers, message, trailers }) => {
            DEBUG && debug("status", status, "statusMessage", statusMessage, "headers", headers, "res", message, "trailers", trailers);
            assert.strictEqual(statusMessage, "Response closed without headers");
            assert.strictEqual(status, grpc.Code.Unknown);
            assert.isNull(message);
            done();
          }
        });
      });

      it(`should report failure for a trailers-only response`, (done) => {
        const ping = new PingRequest();

        grpc.unary(FailService.NonExistant, { // The test server hasn't registered this service, so it should return an error
          debug: DEBUG,
          transport: transport,
          request: ping,
          host: emptyHost,
          onEnd: ({ status, statusMessage, headers, message, trailers }) => {
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

      describe(`exception handling`, () => {
        let uncaughtHandler: UncaughtExceptionListener;
        beforeEach(() => {
          uncaughtHandler = new UncaughtExceptionListener();
          uncaughtHandler.attach();
        });

        afterEach(() => {
          uncaughtHandler.detach();
        });

        it(`should not suppress exceptions`, (done) => {
          const ping = new PingRequest();
          ping.setValue("hello world");

          grpc.unary(TestService.Ping, {
            debug: DEBUG,
            transport: transport,
            request: ping,
            host: testHostUrl,
            onEnd: ({ status, statusMessage, headers, message, trailers }) => {
              DEBUG && debug("status", status, "statusMessage", statusMessage, "headers", headers, "res", message, "trailers", trailers);
              setTimeout(() => {
                uncaughtHandler.detach();
                const exceptionsCaught = uncaughtHandler.getMessages();
                assert.lengthOf(exceptionsCaught, 1);
                assert.include(exceptionsCaught[0], "onEnd exception");
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
