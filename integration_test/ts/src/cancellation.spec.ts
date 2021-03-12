// gRPC-Web library
import {
  grpc,
} from "@improbable-eng/grpc-web";

import {debug} from "../../../client/grpc-web/src/debug";
import {assert} from "chai";

// Generated Test Classes
import {
  CheckStreamClosedRequest, CheckStreamClosedResponse,
  PingRequest,
  PingResponse,
} from "../_proto/improbable/grpcweb/test/test_pb";
import {TestService, TestUtilService} from "../_proto/improbable/grpcweb/test/test_pb_service";
import {DEBUG, continueStream} from "./util";
import { runWithHttp1AndHttp2, runWithSupportedTransports } from "./testRpcCombinations";

describe("Cancellation", () => {
  runWithHttp1AndHttp2(({testHostUrl}) => {
    it("should allow the caller to abort an rpc before it completes", () => {
      let transportCancelFuncInvoked = false;

      const cancellationSpyTransport = () => {
        return {
          sendMessage: () => {
          },
          finishSend() {
          },
          start: () => {
          },
          cancel: () => {
            transportCancelFuncInvoked = true;
          },
        }
      };

      const ping = new PingRequest();
      ping.setValue("hello world");

      const reqObj = grpc.invoke(TestService.Ping, {
        debug: DEBUG,
        request: ping,
        host: testHostUrl,
        transport: cancellationSpyTransport,
        onEnd: (status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
        },
      });

      reqObj.close();

      assert.equal(transportCancelFuncInvoked, true, "transport's cancel func must be invoked");
    });

    runWithSupportedTransports((transport) => {
      it("should handle aborting a streaming response mid-stream with propagation of the disconnection to the server", (done) => {
        let onMessageId = 0;

        const streamIdentifier = `rpc-${Math.random()}`;

        const ping = new PingRequest();
        ping.setValue("hello world");
        ping.setResponseCount(100); // Request more messages than the client will accept before cancelling
        ping.setStreamIdentifier(streamIdentifier);

        let reqObj: grpc.Request;

        // Checks are performed every 1s = 15s total wait
        const maxAbortChecks = 15;

        const numMessagesBeforeAbort = 5;

        const doAbort = () => {
          DEBUG && debug("doAbort");
          reqObj.close();

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

        reqObj = grpc.invoke(TestService.PingList, {
          debug: DEBUG,
          request: ping,
          host: testHostUrl,
          transport: transport,
          onHeaders: (headers: grpc.Metadata) => {
            DEBUG && debug("headers", headers);
          },
          onMessage: (message: PingResponse) => {
            assert.ok(message instanceof PingResponse);
            DEBUG && debug("onMessage.message.getCounter()", message.getCounter());
            assert.strictEqual(message.getCounter(), onMessageId++);
            if (message.getCounter() === numMessagesBeforeAbort) {
              // Abort after receiving numMessagesBeforeAbort messages
              doAbort();
            } else if (message.getCounter() < numMessagesBeforeAbort) {
              // Only request the next message if not yet aborted
              continueStream(testHostUrl, streamIdentifier, (status) => {
                DEBUG && debug("onMessage.continueStream.status", status);
              });
            }
          },
          onEnd: (status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
            DEBUG && debug("status", status, "statusMessage", statusMessage, "trailers", trailers);
            // onEnd shouldn't be called if abort is called prior to the response ending
            assert.fail();
          }
        });
      }, 20000);
    })
  });
});