// gRPC-Web library
import {grpc} from "../../../ts/src/index";

import {debug} from "../../../ts/src/debug";
import {assert} from "chai";
// Generated Test Classes
import {Empty, } from "google-protobuf/google/protobuf/empty_pb";
import {PingRequest, PingResponse, } from "../_proto/improbable/grpcweb/test/test_pb";
import {FailService, TestService} from "../_proto/improbable/grpcweb/test/test_pb_service";
import {continueStream, DEBUG, UncaughtExceptionListener} from "./util";
import {
  headerTrailerCombos, runWithHttp1AndHttp2, runWithSupportedTransports
} from "./testRpcCombinations";
import { conditionallyRunTestSuite, SuiteEnum } from "../suiteUtils";

conditionallyRunTestSuite(SuiteEnum.client, () => {
  runWithHttp1AndHttp2(({testHostUrl, corsHostUrl, unavailableHost, emptyHost}) => {
    runWithSupportedTransports(transport => {
      it(`should throw an error if close is called before start`, () => {
        assert.throw(() => {
          const client = grpc.client(TestService.Ping, {
            debug: DEBUG,
            transport: transport,
            host: testHostUrl,
          });
          client.close();
        }, "Client not started - .start() must be called before .close()");
      });

      it(`should throw an error if send is called before start`, () => {
        const ping = new PingRequest();
        ping.setValue("hello world");
        assert.throw(() => {
          const client = grpc.client(TestService.Ping, {
            debug: DEBUG,
            transport: transport,
            host: testHostUrl,
          });
          client.send(ping);
        }, "Client not started - .start() must be called before .send()");
      });

      it(`should throw an error if start is called twice`, () => {
        assert.throw(() => {
          const client = grpc.client(TestService.Ping, {
            debug: DEBUG,
            transport: transport,
            host: testHostUrl,
          });
          client.start();
          client.start();
        }, "Client already started - cannot .start()");
      });

      it(`should throw an error if send is called more than once for a unary method`, () => {
        const ping = new PingRequest();
        ping.setValue("hello world");
        assert.throw(() => {
          const client = grpc.client(TestService.Ping, {
            debug: DEBUG,
            transport: transport,
            host: testHostUrl,
          });
          client.start();
          client.send(ping);
          client.send(ping);
        }, "Message already sent for non-client-streaming method - cannot .send()");
      });

      it(`should throw an error if send is called after close`, () => {
        const ping = new PingRequest();
        ping.setValue("hello world");
        assert.throw(() => {
          const client = grpc.client(TestService.Ping, {
            debug: DEBUG,
            transport: transport,
            host: testHostUrl,
          });
          client.start();
          client.close();
          client.send(ping);
        }, "Client already closed - cannot .send()");
      });

      headerTrailerCombos((withHeaders, withTrailers) => {
        it(`should make a unary request`, (done) => {
          let didGetOnHeaders = false;
          let didGetOnMessage = false;

          const ping = new PingRequest();
          ping.setValue("hello world");
          ping.setSendHeaders(withHeaders);
          ping.setSendTrailers(withTrailers);

          const client = grpc.client(TestService.Ping, {
            debug: DEBUG,
            transport: transport,
            host: testHostUrl,
          });
          client.onHeaders((headers: grpc.Metadata) => {
            DEBUG && debug("headers", headers);
            didGetOnHeaders = true;
            if (withHeaders) {
              assert.deepEqual(headers.get("HeaderTestKey1"), ["ServerValue1"]);
              assert.deepEqual(headers.get("HeaderTestKey2"), ["ServerValue2"]);
            }
          });
          client.onMessage((message: PingResponse) => {
            didGetOnMessage = true;
            assert.ok(message instanceof PingResponse);
            assert.deepEqual(message.getValue(), "hello world");
            assert.deepEqual(message.getCounter(), 252);
          });
          client.onEnd((status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
            DEBUG && debug("status", status, "statusMessage", statusMessage);
            assert.strictEqual(status, grpc.Code.OK, "expected OK (0)");
            assert.strictEqual(statusMessage, undefined, "expected no message");
            if (withTrailers) {
              assert.deepEqual(trailers.get("TrailerTestKey1"), ["ServerValue1"]);
              assert.deepEqual(trailers.get("TrailerTestKey2"), ["ServerValue2"]);
            }
            assert.ok(didGetOnHeaders);
            assert.ok(didGetOnMessage);
            done();
          });
          client.start();
          client.send(ping);
        });
      });

      headerTrailerCombos((withHeaders, withTrailers) => {
        it(`should make a unary request with metadata`, (done) => {
          let didGetOnHeaders = false;
          let didGetOnMessage = false;

          const ping = new PingRequest();
          ping.setValue("hello world");
          ping.setCheckMetadata(true);
          ping.setSendHeaders(withHeaders);
          ping.setSendTrailers(withTrailers);

          const client = grpc.client(TestService.Ping, {
            debug: DEBUG,
            transport: transport,
            host: testHostUrl,
          });
          client.onHeaders((headers: grpc.Metadata) => {
            DEBUG && debug("headers", headers);
            didGetOnHeaders = true;
            if (withHeaders) {
              assert.deepEqual(headers.get("HeaderTestKey1"), ["ServerValue1"]);
              assert.deepEqual(headers.get("HeaderTestKey2"), ["ServerValue2"]);
            }
          });
          client.onMessage((message: PingResponse) => {
            didGetOnMessage = true;
            assert.ok(message instanceof PingResponse);
            assert.deepEqual(message.getValue(), "hello world");
            assert.deepEqual(message.getCounter(), 252);
          });
          client.onEnd((status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
            DEBUG && debug("status", status, "statusMessage", statusMessage, "trailers", trailers);
            assert.strictEqual(status, grpc.Code.OK, "expected OK (0)");
            assert.strictEqual(statusMessage, undefined, "expected no message");
            if (withTrailers) {
              assert.deepEqual(trailers.get("TrailerTestKey1"), ["ServerValue1"]);
              assert.deepEqual(trailers.get("TrailerTestKey2"), ["ServerValue2"]);
            }
            assert.ok(didGetOnHeaders);
            assert.ok(didGetOnMessage);
            done();
          });
          client.start(new grpc.Metadata({"HeaderTestKey1": "ClientValue1"}));
          client.send(ping);
        });
      });

      headerTrailerCombos((withHeaders, withTrailers) => {
        it(`should handle a streaming response of multiple messages`, (done) => {
          let didGetOnHeaders = false;
          let onMessageId = 0;

          const ping = new PingRequest();
          ping.setValue("hello world");
          ping.setResponseCount(3000);
          ping.setSendHeaders(withHeaders);
          ping.setSendTrailers(withTrailers);

          const client = grpc.client(TestService.PingList, {
            debug: DEBUG,
            transport: transport,
            host: testHostUrl,
          });
          client.onHeaders((headers: grpc.Metadata) => {
            DEBUG && debug("headers", headers);
            didGetOnHeaders = true;
            if (withHeaders) {
              assert.deepEqual(headers.get("HeaderTestKey1"), ["ServerValue1"]);
              assert.deepEqual(headers.get("HeaderTestKey2"), ["ServerValue2"]);
            }
          });
          client.onMessage((message: PingResponse) => {
            assert.ok(message instanceof PingResponse);
            assert.strictEqual(message.getCounter(), onMessageId++);
          });
          client.onEnd((status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
            DEBUG && debug("status", status, "statusMessage", statusMessage, "trailers", trailers);
            assert.strictEqual(status, grpc.Code.OK, "expected OK (0)");
            assert.strictEqual(statusMessage, undefined, "expected no message");
            if (withTrailers) {
              assert.deepEqual(trailers.get("TrailerTestKey1"), ["ServerValue1"]);
              assert.deepEqual(trailers.get("TrailerTestKey2"), ["ServerValue2"]);
            }
            assert.ok(didGetOnHeaders);
            assert.strictEqual(onMessageId, 3000);
            done();
          });
          client.start();
          client.send(ping);
        });
      });

      headerTrailerCombos((withHeaders, withTrailers) => {
        it(`should receive individual cadenced messages`, (done) => {
          let didGetOnHeaders = false;
          let onMessageId = 0;

          const streamIdentifier = `rpc-${Math.random()}`;

          const ping = new PingRequest();
          ping.setValue("hello world");
          ping.setResponseCount(5);
          ping.setSendHeaders(withHeaders);
          ping.setSendTrailers(withTrailers);
          ping.setStreamIdentifier(streamIdentifier);

          const client = grpc.client(TestService.PingList, {
            debug: DEBUG,
            transport: transport,
            host: testHostUrl,
          });
          client.onHeaders((headers: grpc.Metadata) => {
            DEBUG && debug("headers", headers);
            didGetOnHeaders = true;
            if (withHeaders) {
              assert.deepEqual(headers.get("HeaderTestKey1"), ["ServerValue1"]);
              assert.deepEqual(headers.get("HeaderTestKey2"), ["ServerValue2"]);
            }
          });
          client.onMessage((message: PingResponse) => {
            continueStream(testHostUrl, streamIdentifier, (status) => {
              DEBUG && debug("continueStream.status", status);
            });
            assert.ok(message instanceof PingResponse);
            assert.strictEqual(message.getCounter(), onMessageId++);
          });
          client.onEnd((status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
            DEBUG && debug("status", status, "statusMessage", statusMessage, "trailers", trailers);
            assert.strictEqual(status, grpc.Code.OK, "expected OK (0)");
            assert.strictEqual(statusMessage, undefined, "expected no message");
            if (withTrailers) {
              assert.deepEqual(trailers.get("TrailerTestKey1"), ["ServerValue1"]);
              assert.deepEqual(trailers.get("TrailerTestKey2"), ["ServerValue2"]);
            }
            assert.ok(didGetOnHeaders);
            assert.strictEqual(onMessageId, 5);
            done();
          });
          client.start();
          client.send(ping);
        }, 10000); // Set timeout to 10s
      });

      headerTrailerCombos((withHeaders, withTrailers) => {
        it(`should handle a streaming response of no messages`, (done) => {
          let didGetOnHeaders = false;
          let onMessageId = 0;

          const ping = new PingRequest();
          ping.setValue("hello world");
          ping.setResponseCount(0);
          ping.setSendHeaders(withHeaders);
          ping.setSendTrailers(withTrailers);

          const client = grpc.client(TestService.PingList, {
            debug: DEBUG,
            transport: transport,
            host: testHostUrl,
          });
          client.onHeaders((headers: grpc.Metadata) => {
            DEBUG && debug("headers", headers);
            didGetOnHeaders = true;
            if (withHeaders) {
              assert.deepEqual(headers.get("HeaderTestKey1"), ["ServerValue1"]);
              assert.deepEqual(headers.get("HeaderTestKey2"), ["ServerValue2"]);
            }
          });
          client.onMessage((message: PingResponse) => {
            assert.ok(message instanceof PingResponse);
            assert.strictEqual(message.getCounter(), onMessageId++);
          });
          client.onEnd((status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
            DEBUG && debug("status", status, "statusMessage", statusMessage, "trailers", trailers);
            assert.strictEqual(status, grpc.Code.OK, "expected OK (0)");
            assert.strictEqual(statusMessage, undefined, "expected no message");
            if (withTrailers) {
              assert.deepEqual(trailers.get("TrailerTestKey1"), ["ServerValue1"]);
              assert.deepEqual(trailers.get("TrailerTestKey2"), ["ServerValue2"]);
            }
            assert.ok(didGetOnHeaders);
            assert.strictEqual(onMessageId, 0);
            done();
          });
          client.start();
          client.send(ping);
        });
      });

      headerTrailerCombos((withHeaders, withTrailers) => {
        it(`should report status code for error with headers + trailers`, (done) => {
          let didGetOnHeaders = false;
          let didGetOnMessage = false;

          const ping = new PingRequest();
          ping.setFailureType(PingRequest.FailureType.CODE);
          ping.setErrorCodeReturned(12);
          ping.setSendHeaders(withHeaders);
          ping.setSendTrailers(withTrailers);

          const client = grpc.client(TestService.PingError, {
            debug: DEBUG,
            transport: transport,
            host: testHostUrl,
          });
          client.onHeaders((headers: grpc.Metadata) => {
            DEBUG && debug("headers", headers);
            didGetOnHeaders = true;
          });
          client.onMessage((message: Empty) => {
            didGetOnMessage = true;
          });
          client.onEnd((status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
            DEBUG && debug("status", status, "statusMessage", statusMessage, "trailers", trailers);
            assert.deepEqual(trailers.get("grpc-status"), ["12"]);
            assert.deepEqual(trailers.get("grpc-message"), ["Intentionally returning error for PingError"]);
            assert.strictEqual(status, grpc.Code.Unimplemented);
            assert.strictEqual(statusMessage, "Intentionally returning error for PingError");
            assert.ok(didGetOnHeaders);
            assert.ok(!didGetOnMessage);
            done();
          });
          client.start();
          client.send(ping);
        });
      });

      if (!process.env.DISABLE_CORS_TESTS) {
        it(`should report failure for a CORS failure`, (done) => {
          let didGetOnHeaders = false;
          let didGetOnMessage = false;

          const ping = new PingRequest();

          const client = grpc.client(FailService.NonExistant, { // The test server hasn't registered this service, so it should fail CORS
            debug: DEBUG,
            transport: transport,
            // This test is actually calling the same server as the other tests, but the server should reject the OPTIONS call
            // because the service isn't registered. This could be the same host as all other tests (that should be CORS
            // requests because they differ by port from the page the tests are run from), but IE treats different ports on
            // the same host as the same origin, so this request has to be made to a different host to trigger CORS behaviour.
            host: corsHostUrl,
          });
          client.onHeaders((headers: grpc.Metadata) => {
            DEBUG && debug("headers", headers);
            didGetOnHeaders = true;
          });
          client.onMessage((message: Empty) => {
            didGetOnMessage = true;
          });
          client.onEnd((status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
            DEBUG && debug("status", status, "statusMessage", statusMessage, "trailers", trailers);
            // Some browsers return empty Headers for failed requests
            assert.strictEqual(statusMessage, "Response closed without headers");
            assert.strictEqual(status, grpc.Code.Unknown);
            assert.ok(!didGetOnMessage);
            done();
          });
          client.start();
          client.send(ping);
        });
      }

      it(`should report failure for a dropped response after headers`, (done) => {
        let didGetOnHeaders = false;
        let didGetOnMessage = false;

        const ping = new PingRequest();
        ping.setFailureType(PingRequest.FailureType.DROP);

        const client = grpc.client(TestService.PingError, {
          debug: DEBUG,
          transport: transport,
          host: testHostUrl,
        });
        client.onHeaders((headers: grpc.Metadata) => {
          DEBUG && debug("headers", headers);
          didGetOnHeaders = true;
          assert.deepEqual(headers.get("grpc-status"), []);
          assert.deepEqual(headers.get("grpc-message"), []);
        });
        client.onMessage((message: Empty) => {
          didGetOnMessage = true;
        });
        client.onEnd((status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
          DEBUG && debug("status", status, "statusMessage", statusMessage, "trailers", trailers);
          assert.strictEqual(statusMessage, "Response closed without grpc-status (Headers only)");
          assert.strictEqual(status, grpc.Code.Unknown);
          assert.ok(!didGetOnMessage);
          done();
        });
        client.start();
        client.send(ping);
      });

      it(`should report failure for a request to an invalid host`, (done) => {
        let didGetOnHeaders = false;
        let didGetOnMessage = false;

        const ping = new PingRequest();

        const client = grpc.client(TestService.Ping, {
          debug: DEBUG,
          transport: transport,
          host: unavailableHost, // Should not be available
        });
        client.onHeaders((headers: grpc.Metadata) => {
          DEBUG && debug("headers", headers);
          didGetOnHeaders = true;
        });
        client.onMessage((message: Empty) => {
          didGetOnMessage = true;
        });
        client.onEnd((status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
          DEBUG && debug("status", status, "statusMessage", statusMessage, "trailers", trailers);
          assert.strictEqual(statusMessage, "Response closed without headers");
          assert.strictEqual(status, grpc.Code.Unknown);
          assert.ok(!didGetOnMessage);
          done();
        });
        client.start();
        client.send(ping);
      });

      it(`should report failure for a trailers-only response`, (done) => {
        let didGetOnHeaders = false;
        let didGetOnMessage = false;

        const ping = new PingRequest();

        const client = grpc.client(FailService.NonExistant, { // The test server hasn't registered this service, so it should return an error
          debug: DEBUG,
          transport: transport,
          host: emptyHost,
        });
        client.onHeaders((headers: grpc.Metadata) => {
          DEBUG && debug("headers", headers);
          didGetOnHeaders = true;
          assert.deepEqual(headers.get("grpc-status"), ["12"]);
          assert.deepEqual(headers.get("grpc-message"), ["unknown service improbable.grpcweb.test.FailService"]);
        });
        client.onMessage((message: Empty) => {
          didGetOnMessage = true;
        });
        client.onEnd((status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
          DEBUG && debug("status", status, "statusMessage", statusMessage, "trailers", trailers);
          assert.strictEqual(statusMessage, "unknown service improbable.grpcweb.test.FailService");
          assert.strictEqual(status, 12);
          assert.deepEqual(trailers.get("grpc-status"), ["12"]);
          assert.deepEqual(trailers.get("grpc-message"), ["unknown service improbable.grpcweb.test.FailService"]);
          assert.ok(didGetOnHeaders);
          assert.ok(!didGetOnMessage);
          done();
        });
        client.start();
        client.send(ping);
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

          const client = grpc.client(TestService.Ping, {
            debug: DEBUG,
            transport: transport,
            host: testHostUrl,
          });
          client.onHeaders((headers: grpc.Metadata) => {
            throw new Error("onHeaders exception");
          });
          client.onMessage((message: PingResponse) => {
            throw new Error("onMessage exception");
          });
          client.onEnd((status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
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
          });
          client.start();
          client.send(ping);
        });
      });
    });
  });
});

