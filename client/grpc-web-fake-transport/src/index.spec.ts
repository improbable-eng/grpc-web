import {FakeTransportBuilder, frameRequest, TriggerableTransport} from "./index";
import {PingRequest, PingResponse} from "../../../integration_test/ts/_proto/improbable/grpcweb/test/test_pb";
import {TestService} from "../../../integration_test/ts/_proto/improbable/grpcweb/test/test_pb_service";
import {grpc} from "@improbable-eng/grpc-web";

describe("FakeTransportBuilder", () => {
  describe("stubs", () => {
    it("should allow the response messages to be stubbed", done => {
      const pingResponseMsg = makePingResponse("hello");
      const transport = new FakeTransportBuilder()
        .withMessages([ pingResponseMsg ])
        .build();

      doPingRequest(transport, new PingRequest(), data => {
        expect(data.receivedMessages).toEqual( [ pingResponseMsg ]);
        done();
      })
    });

    it("should allow the response trailers to be stubbed", done => {
      const expectedTrailers = new grpc.Metadata({ foo: "bar" });
      const transport = new FakeTransportBuilder()
        .withTrailers(expectedTrailers)
        .build();

      doPingRequest(transport, new PingRequest(), data => {
        expect(data.trailers).toEqual(expectedTrailers);
        done();
      })
    });

    it("should allow an error to be injected before any headers are sent", done => {
      const transport = new FakeTransportBuilder()
        .withPreHeadersError(500)
        .withMessages([ makePingResponse("hello") ])
        .build();

      doPingRequest(transport, new PingRequest(), data => {
        expect(data.message).toBe("");
        expect(data.code).toBe(grpc.Code.Unknown);

        // message should not have been sent as an error should have been injected before any messages were sent.
        expect(data.receivedMessages).toEqual([]);

        done();
      })
    });

    it("should allow an error to be injected before any messages are sent", done => {
      const pingResponseMsg = makePingResponse("hello");
      const trailers = new grpc.Metadata({ foo: "bar" });
      const transport = new FakeTransportBuilder()
        .withPreMessagesError(grpc.Code.FailedPrecondition, "failed precondition :)")
        .withMessages([ pingResponseMsg ])
        .withTrailers(trailers)
        .build();

      doPingRequest(transport, new PingRequest(), data => {
        expect(data.code).toBe(grpc.Code.FailedPrecondition);
        expect(data.message).toBe("failed precondition :)");

        // message should not have been sent as an error should have been injected before any messages were sent.
        expect(data.receivedMessages).toEqual([]);

        // custom trailer ("foo") should not have been sent as an error was injected before any messages were sent.
        expectMetadataEqual(data.trailers, {
          "grpc-message": [ "failed precondition :)"],
          "grpc-status": [ `${grpc.Code.FailedPrecondition}` ],
        });
        done();
      })
    });

    it("should allow an error to be injected after messages are sent", done => {
      const pingResponseMsg = makePingResponse("hello");
      const trailers = new grpc.Metadata({ foo: "bar" });
      const transport = new FakeTransportBuilder()
        .withPreTrailersError(grpc.Code.FailedPrecondition, "failed precondition :)")
        .withMessages([ pingResponseMsg ])
        .withTrailers(trailers)
        .build();

      doPingRequest(transport, new PingRequest(), data => {
        expect(data.code).toBe(grpc.Code.FailedPrecondition);
        expect(data.message).toBe("failed precondition :)");
        expect(data.receivedMessages).toEqual([ pingResponseMsg ]);

        // custom trailer ("foo") should not have been sent as an error was injected before any messages were sent.
        expectMetadataEqual(data.trailers, {
          "grpc-message": [ "failed precondition :)"],
          "grpc-status": [ `${grpc.Code.FailedPrecondition}` ],
        });
        done();
      })
    });
  });

  describe("hooks", () => {
    describe("withMessageListener", () => {
      it("should not be called if no message is sent", done => {
        const messageSpy = jest.fn();
        const transport = new FakeTransportBuilder()
          .withMessageListener(messageSpy)
          .build();

        doPingStreamRequest(transport, [], () => {
          expect(messageSpy).toHaveBeenCalledTimes(0);
          done();
        });
      });

      it("should be called once with the message bytes if a single message is sent", done => {
        const messageSpy = jest.fn();
        const req = makePingRequest("hello");
        const expectedBytes = frameRequest(req);

        const transport = new FakeTransportBuilder()
          .withMessageListener(messageBytes => {
            messageSpy(messageBytes);
          })
          .build();

        doPingStreamRequest(transport, [ req ], () => {
          expect(messageSpy).toHaveBeenCalledTimes(1);
          expect(messageSpy).toHaveBeenCalledWith(expectedBytes);
          done();
        });
      });

      it("should be called twice, in message order, when two messages are sent", done => {
        const messageSpy = jest.fn();
        const reqA = makePingRequest("req A");
        const reqB = makePingRequest("req B");
        const expectedBytes = [ frameRequest(reqA), frameRequest(reqB) ];

        const transport = new FakeTransportBuilder()
          .withMessageListener(messageSpy)
          .build();

        doPingStreamRequest(transport, [ reqA, reqB ], () => {
          expect(messageSpy).toHaveBeenCalledTimes(2);
          for (let i = 0; i < messageSpy.mock.calls.length; i++) {
            expect(messageSpy.mock.calls[i][0]).toEqual(expectedBytes[i]);
          }
          done();
        });
      });
    });

    describe("withHeadersListener", () => {
      it("should be called once with the metadata object passed to client.start()", done => {
        const headersSpy = jest.fn();
        const expectedHeaders = new grpc.Metadata({ expected: "header" });

        const transport = new FakeTransportBuilder()
          .withHeadersListener(headersSpy)
          .build();

        const client = makeClient(TestService.PingStream, transport, () => {
          expect(headersSpy).toHaveBeenCalledTimes(1);
          const receivedHeaders = headersSpy.mock.calls[0][0];
          expect(receivedHeaders.get("expected")).toEqual([ "header" ]);
          done();
        });

        client.start(expectedHeaders);
        client.finishSend();
      })
    });

    describe("withRequestListener", () => {
      it("should be called once with the grpc.TransportOptions that were used to make the request", done => {
        const requestSpy = jest.fn();

        const transport = new FakeTransportBuilder()
          .withRequestListener(requestSpy)
          .build();

        doPingRequest(transport, new PingRequest(), () => {
          expect(requestSpy).toHaveBeenCalledTimes(1);
          const actual: grpc.TransportOptions = requestSpy.mock.calls[0][0];
          expect(actual.methodDefinition).toBe(TestService.Ping);
          expect(actual.url).toBe("localhost/improbable.grpcweb.test.TestService/Ping");
          done();
        });
      })
    });

    describe("withCancelListener", () => {
      it("should be called once should the request be cancelled by the client", done => {
        const cancelSpy = jest.fn();

        const transport = new FakeTransportBuilder()
          .withCancelListener(cancelSpy)
          .build();

        const client = makeClient(TestService.Ping, transport, () => {});
        client.start();
        expect(cancelSpy).not.toHaveBeenCalled();

        client.close();
        expect(cancelSpy).toHaveBeenCalledTimes(1);

        done();
      })
    });

    describe("withFinishSendListener", () => {
      it("should be called once when the client finishes sending messages to the server", done => {
        const finishSendSpy = jest.fn();

        const transport = new FakeTransportBuilder()
          .withFinishSendListener(finishSendSpy)
          .build();

        const client = makeClient(TestService.Ping, transport, () => {});

        client.start();
        client.send(new PingResponse());
        expect(finishSendSpy).not.toHaveBeenCalled();

        client.finishSend();
        expect(finishSendSpy).toHaveBeenCalledTimes(1);

        done();
      })
    });

  });

  describe("manual trigger", () => {
    it("should allow the consumer to control the lifecycle of the server response", () => {
      const onHeadersSpy = jest.fn();
      const onMessageSpy = jest.fn();
      const onEndSpy = jest.fn();

      const transport = new FakeTransportBuilder()
        .withManualTrigger()
        .withHeaders(new grpc.Metadata({ header: "value" }))
        .withMessages([ makePingResponse("msgA") ])
        .withTrailers(new grpc.Metadata({ trailer: "value" }))
        .build();

      const client = grpc.client(TestService.Ping, {
        host: "localhost",
        transport,
      });

      client.onHeaders(onHeadersSpy);
      client.onMessage(onMessageSpy);
      client.onEnd(onEndSpy);

      client.start();
      client.send(new PingRequest());
      client.finishSend();

      expect(onHeadersSpy).not.toHaveBeenCalled();
      expect(onMessageSpy).not.toHaveBeenCalled();
      expect(onEndSpy).not.toHaveBeenCalled();

      transport.sendHeaders();

      expect(onHeadersSpy).toHaveBeenCalled();
      expect(onMessageSpy).not.toHaveBeenCalled();
      expect(onEndSpy).not.toHaveBeenCalled();

      transport.sendMessages();
      expect(onHeadersSpy).toHaveBeenCalled();
      expect(onMessageSpy).toHaveBeenCalled();
      expect(onEndSpy).not.toHaveBeenCalled();

      transport.sendTrailers();
      expect(onHeadersSpy).toHaveBeenCalled();
      expect(onMessageSpy).toHaveBeenCalled();
      expect(onEndSpy).toHaveBeenCalled();
    });
  });


  // Ideally this would be a custom matcher, but this also works :)
  function expectMetadataEqual(actual: grpc.Metadata, expectedMetadataEntries: { [k: string]: string[] }) {
    const actualMetadataEntries: { [k: string]: string[] } = {};
    actual.forEach((key: string, values: string[]) => {
      actualMetadataEntries[key] = values;
    });
    expect(actualMetadataEntries).toEqual(expectedMetadataEntries);
  }

  function makePingRequest(value: string): PingRequest {
    const r = new PingRequest();
    r.setValue(value);
    return r;
  }

  function makePingResponse(value: string): PingResponse {
    const r = new PingResponse();
    r.setValue(value);
    return r;
  }

  interface RequestResponse<T> {
    receivedMessages: T[]
    code: grpc.Code
    message: string
    receivedHeaders: grpc.Metadata
    trailers: grpc.Metadata
  }

  function makeClient<TRequest extends grpc.ProtobufMessage, TResponse extends grpc.ProtobufMessage, M extends grpc.MethodDefinition<TRequest, TResponse>>(method: M, transport: TriggerableTransport, callback: (data: RequestResponse<TResponse>) => void) {
    const client = grpc.client(method, {
      host: "localhost",
      transport,
    });

    const receivedMessages: TResponse[] = [];
    let receivedHeaders: grpc.Metadata = new grpc.Metadata();

    client.onMessage(message => receivedMessages.push(message as TResponse));
    client.onHeaders(headers => receivedHeaders = headers);

    client.onEnd((code, message, trailers) => callback({
      receivedMessages,
      receivedHeaders,
      code,
      message,
      trailers
    }));
    return client;
  }

  function doPingRequest(transport: TriggerableTransport, req: PingRequest, callback: (data: RequestResponse<PingResponse>) => void) {
    const client = makeClient(TestService.Ping, transport, callback);
    client.start();
    client.send(req);
    client.finishSend();
  }

  function doPingStreamRequest(transport: TriggerableTransport, requests: PingRequest[], callback: (data: RequestResponse<PingResponse>) => void) {
    const client = makeClient(TestService.PingStream, transport, callback);
    client.start();
    for (const req of requests) {
      client.send(req);
    }
    client.finishSend();
  }
});
