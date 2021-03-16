// gRPC-Web library
import { grpc } from "@improbable-eng/grpc-web";

import { debug } from "../../../client/grpc-web/src/debug";
import { assert } from "chai";
// Generated Test Classes
import {
  CheckStreamClosedRequest,
  CheckStreamClosedResponse,
  PingRequest,
  PingResponse
} from "../_proto/improbable/grpcweb/test/test_pb";
import { TestService, TestUtilService } from "../_proto/improbable/grpcweb/test/test_pb_service";
import { continueStream, DEBUG, DISABLE_WEBSOCKET_TESTS } from "./util";
import { headerTrailerCombos, runWithHttp1AndHttp2 } from "./testRpcCombinations";

if (DISABLE_WEBSOCKET_TESTS) {
  console.log(`Skipping "clientWebsockets" suite as "DISABLE_WEBSOCKET_TESTS" is set`);
  describe("skipping client-streaming (websockets)", () => {
    it("should skip client-streaming request tests", (done) => {
      done();
    });
  });
} else {
  describe("ClientWebsockets", () => {
    runWithHttp1AndHttp2(({testHostUrl}) => {
      describe("client-streaming (websockets)", () => {
        headerTrailerCombos((withHeaders, withTrailers) => {
          it("should make a client-streaming request", (done) => {
            let didGetOnHeaders = false;
            let didGetMessage = false;
            const client = grpc.client(TestService.PingStream, {
              debug: DEBUG,
              host: testHostUrl,
              transport: grpc.WebsocketTransport(),
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
              assert.deepEqual(message.getValue(), "one,two");
              didGetMessage = true;
            });
            client.onEnd((status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
              DEBUG && debug("status", status, "statusMessage", statusMessage);
              assert.strictEqual(status, grpc.Code.OK, "expected OK (0)");
              assert.strictEqual(statusMessage, "", "expected no message");
              if (withTrailers) {
                assert.deepEqual(trailers.get("TrailerTestKey1"), ["ServerValue1"]);
                assert.deepEqual(trailers.get("TrailerTestKey2"), ["ServerValue2"]);
              }
              assert.ok(didGetOnHeaders, "didGetOnHeaders");
              assert.ok(didGetMessage, "didGetMessage");
              done();
            });
            client.start();

            const pingOne = new PingRequest();
            pingOne.setSendHeaders(withHeaders);
            pingOne.setSendTrailers(withTrailers);
            pingOne.setValue(`one`);
            client.send(pingOne);

            const pingTwo = new PingRequest();
            pingTwo.setValue(`two`);
            client.send(pingTwo);

            client.finishSend();
          });
        });
      });

      describe("bidirectional (websockets)", () => {
        headerTrailerCombos((withHeaders, withTrailers) => {
          it("should make a bidirectional request that is ended by the client finishing sending", (done) => {
            let didGetOnHeaders = false;
            let counter = 1;
            let lastMessage = `helloworld:${counter}`;
            const ping = new PingRequest();
            ping.setSendHeaders(withHeaders);
            ping.setSendTrailers(withTrailers);
            ping.setValue(lastMessage);

            const client = grpc.client(TestService.PingPongBidi, {
              debug: DEBUG,
              host: testHostUrl,
              transport: grpc.WebsocketTransport(),
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
              assert.deepEqual(message.getValue(), lastMessage);

              if (counter === 10) {
                client.finishSend();
              } else {
                counter++;
                lastMessage = `helloworld:${counter}`;
                const ping = new PingRequest();
                ping.setValue(lastMessage);
                client.send(ping);
              }
            });
            client.onEnd((status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
              DEBUG && debug("status", status, "statusMessage", statusMessage);
              assert.strictEqual(status, grpc.Code.OK, "expected OK (0)");
              assert.strictEqual(statusMessage, "", "expected no message");
              if (withTrailers) {
                assert.deepEqual(trailers.get("TrailerTestKey1"), ["ServerValue1"]);
                assert.deepEqual(trailers.get("TrailerTestKey2"), ["ServerValue2"]);
              }
              assert.ok(didGetOnHeaders, "didGetOnHeaders");

              assert.equal(counter, 10, "counter should have been incremented to 10");
              done();
            });
            client.start();

            // send initial message
            client.send(ping);
          });
        });

        headerTrailerCombos((withHeaders, withTrailers) => {
          it("should make a bidirectional request that is aborted by the client with propagation of the disconnection to the server", (done) => {
            let didGetOnHeaders = false;
            let counter = 1;
            const streamIdentifier = `rpc-${Math.random()}`;
            let lastMessage = `helloworld:${counter}`;
            const ping = new PingRequest();
            ping.setStreamIdentifier(streamIdentifier);
            ping.setSendHeaders(withHeaders);
            ping.setSendTrailers(withTrailers);
            ping.setValue(lastMessage);

            const client = grpc.client(TestService.PingPongBidi, {
              debug: DEBUG,
              host: testHostUrl,
              transport: grpc.WebsocketTransport(),
            });

            // Checks are performed every 1s = 15s total wait
            const maxAbortChecks = 15;

            const doAbort = () => {
              DEBUG && debug("doAbort");
              client.close();

              // To ensure that the transport is successfully closing the connection, poll the server every 1s until
              // it confirms the connection was closed. Connection closure is immediate in some browser/transport combinations,
              // but can take several seconds in others.
              function checkAbort(attempt: number) {
                DEBUG && debug("checkAbort", attempt);
                continueStream(testHostUrl, streamIdentifier, (status) => {
                  DEBUG && debug("checkAbort.continueStream.status", status);

                  const checkStreamClosedRequest = new CheckStreamClosedRequest();
                  checkStreamClosedRequest.setStreamIdentifier(streamIdentifier);
                  grpc.unary(TestUtilService.CheckStreamClosed, {
                    debug: DEBUG,
                    request: checkStreamClosedRequest,
                    host: testHostUrl,
                    onEnd: ({message}) => {
                      const closed = ( message as CheckStreamClosedResponse ).getClosed();
                      DEBUG && debug("closed", closed);
                      if (closed) {
                        done();
                      } else {
                        if (attempt >= maxAbortChecks) {
                          assert.ok(closed, `server did not observe connection closure within ${maxAbortChecks} seconds`);
                          done();
                        } else {
                          setTimeout(() => {
                            checkAbort(attempt + 1);
                          }, 1000);
                        }
                      }
                    },
                  })
                });
              }

              checkAbort(0);
            };

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
              assert.deepEqual(message.getValue(), lastMessage);

              if (counter === 10) {
                doAbort();
              } else {
                counter++;
                lastMessage = `helloworld:${counter}`;
                const ping = new PingRequest();
                ping.setValue(lastMessage);
                client.send(ping);
              }
            });
            client.onEnd((status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
              DEBUG && debug("status", status, "statusMessage", statusMessage);
              // onEnd shouldn't be called if abort is called prior to the response ending
              assert.fail();
            });
            client.start();

            // send initial message
            client.send(ping);
          });
        });

        headerTrailerCombos((withHeaders, withTrailers) => {
          it("should make a bidirectional request that is terminated by the server", (done) => {
            let didGetOnHeaders = false;
            let didGetOnMessage = false;

            let counter = 1;
            let lastMessage = `helloworld:${counter}`;
            const ping = new PingRequest();
            ping.setSendHeaders(withHeaders);
            ping.setSendTrailers(withTrailers);
            ping.setValue(lastMessage);

            const client = grpc.client(TestService.PingPongBidi, {
              debug: DEBUG,
              host: testHostUrl,
              transport: grpc.WebsocketTransport(),
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
              assert.deepEqual(message.getValue(), lastMessage);

              if (counter === 10) {
                const ping = new PingRequest();
                ping.setFailureType(PingRequest.FailureType.CODE);
                ping.setErrorCodeReturned(grpc.Code.OK);
                client.send(ping);
              } else {
                counter++;
                lastMessage = `helloworld:${counter}`;
                const ping = new PingRequest();
                ping.setValue(lastMessage);
                client.send(ping);
              }
            });
            client.onEnd((status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
              DEBUG && debug("status", status, "statusMessage", statusMessage);
              assert.strictEqual(status, grpc.Code.OK, "expected OK (0)");
              assert.strictEqual(statusMessage, "", "expected no message");
              if (withTrailers) {
                assert.deepEqual(trailers.get("TrailerTestKey1"), ["ServerValue1"]);
                assert.deepEqual(trailers.get("TrailerTestKey2"), ["ServerValue2"]);
              }
              assert.ok(didGetOnHeaders, "didGetOnHeaders");

              assert.equal(counter, 10, "counter should have been incremented to 10");
              done();
            });
            client.start();

            // send initial message
            client.send(ping);
          });
        });
      });
    });
  });
}
