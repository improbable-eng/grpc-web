import { Message } from "google-protobuf";
import { grpc } from "@improbable-eng/grpc-web";
import assignIn = require("lodash.assignin");

function frameResponse(request: Message): Uint8Array {
  const bytes = request.serializeBinary();
  const frame = new ArrayBuffer(bytes.byteLength + 5);
  new DataView(frame, 0, 5).setUint32(1, bytes.length, false /* big endian */);
  new Uint8Array(frame, 5).set(bytes);
  return new Uint8Array(frame);
}

export function frameRequest(request: Message): ArrayBufferView {
  const bytes = request.serializeBinary();
  const frame = new ArrayBuffer(bytes.byteLength + 5);
  new DataView(frame, 1, 4).setUint32(0, bytes.length, false /* big endian */);
  new Uint8Array(frame, 5).set(bytes);
  return new Uint8Array(frame);
}

function frameTrailers(trailers: grpc.Metadata): Uint8Array {
  let asString = "";
  trailers.forEach((key: string, values: string[]) => {
    asString += `${key}: ${values.join(", ")}\r\n`;
  });
  const bytes = new Buffer(asString);
  const frame = new ArrayBuffer(bytes.byteLength + 5);
  const dataview = new DataView(frame, 0, 5);
  dataview.setUint32(1, bytes.length, false /* big endian */);
  dataview.setUint8(0, 128);
  new Uint8Array(frame, 5).set(bytes);
  return new Uint8Array(frame);
}

/**
 * FakeTransportBuilder is a builder pattern implementation which allows you to configure a new
 * FakeTransport instance.
 *
 * @class
 */
export class FakeTransportBuilder {
  private requestListener: (options: grpc.TransportOptions) => void;
  private headersListener: (headers: grpc.Metadata) => void;
  private messageListener: (messageBytes: ArrayBufferView) => void;
  private finishSendListener: () => void;
  private cancelListener: () => void;
  private preHeadersErrorCode: number | null = null;
  private headers: grpc.Metadata | null = null;
  private preMessagesError: [grpc.Code, string] | null = null;
  private messages: Array<Message> = [];
  private preTrailersError: [grpc.Code, string] | null = null;
  private trailers: grpc.Metadata | null = null;
  private autoTrigger: boolean = true;

  /**
   * withRequestListener is a hook which allows you to listen for when a request is made to the server
   * via the FakeTransport being constructed.
   *
   * @param {(options: TransportOptions) => void} requestListener
   * @returns {this}
   */
  withRequestListener(requestListener: (options: grpc.TransportOptions) => void) {
    this.requestListener = requestListener;
    return this;
  }

  /**
   * withHeadersListener is a hook which allows you to listen for any headers which were sent to the
   * server via the FakeTransport being constructed.
   *
   * @param {(headers: BrowserHeaders) => void} headersListener
   * @returns {this}
   */
  withHeadersListener(headersListener: (headers: grpc.Metadata) => void) {
    this.headersListener = headersListener;
    return this;
  }

  /**
   * withMessageListener is a hook which allows you to listen for any messages sent by the client to
   * the server via the FakeTransport being constructed.
   *
   * @param {(messageBytes: ArrayBufferView) => void} messageListener
   * @returns {this}
   */
  withMessageListener(messageListener: (messageBytes: ArrayBufferView) => void) {
    this.messageListener = messageListener;
    return this;
  }

  /**
   * withFinishSendListener is a hook which allows you to listen for when the client finishes
   * sending messages to the server.
   *
   * @param {() => void} finishSendListener
   * @returns {this}
   */
  withFinishSendListener(finishSendListener: () => void) {
    this.finishSendListener = finishSendListener;
    return this;
  }

  /**
   * withCancelListener is a hook which allows you to listen for a request to close/cancel the
   * FakeTransport being constructed.
   *
   * @param {() => void} cancelListener
   * @returns {this}
   */
  withCancelListener(cancelListener: () => void) {
    this.cancelListener = cancelListener;
    return this;
  }

  /**
   * withPreHeadersError allows you to simulate a fault with the server where the request was
   * terminated before any grpc Headers could be sent.
   *
   * @param {number} httpStatusCode
   * @returns {this}
   */
  withPreHeadersError(httpStatusCode: number) {
    this.preHeadersErrorCode = httpStatusCode;
    return this;
  }

  /**
   * withPreMessagesError allows you to simulate a fault with the server were the request was terminated
   * after the grpc Headers were sent, but before any messages could be sent.
   *
   * @param {Code} grpcStatus
   * @param {string} grpcMessage
   * @returns {this}
   */
  withPreMessagesError(grpcStatus: grpc.Code, grpcMessage: string) {
    this.preMessagesError = [grpcStatus, grpcMessage];
    return this;
  }

  /**
   * withPreTrailersError allows you to simulate a fault with the server where the request was
   * terminated after the grpc Headers, and messages were sent, but before the grpc Trailers could be
   * sent.
   *
   * @param {Code} grpcStatus
   * @param {string} grpcMessage
   * @returns {this}
   */
  withPreTrailersError(grpcStatus: grpc.Code, grpcMessage: string) {
    this.preTrailersError = [grpcStatus, grpcMessage];
    return this;
  }

  /**
   * withHeaders allows you to stub the grpc Headers which will be returned by the server in response
   * to any request made via the FakeTransport being constructed.
   *
   * @param {Metadata} headers
   * @returns {this}
   */
  withHeaders(headers: grpc.Metadata) {
    this.headers = headers;
    return this;
  }

  /**
   * withMessages allows you to stub the messages which will be returned by the server in response
   * to any request made via the FakeTransport being constructed.
   *
   * @param {Array<Message>} messages
   * @returns {this}
   */
  withMessages(messages: Array<Message>) {
    this.messages = messages;
    return this;
  }

  /**
   * withTrailers allows you to sub the grpc Trailers which will be returned by the server in resposne
   * to any request made via the FakeTransport being constructed.
   *
   * @param {Metadata} trailers
   * @returns {this}
   */
  withTrailers(trailers: grpc.Metadata) {
    this.trailers = trailers;
    return this;
  }

  /**
   * withManualTrigger allows you to have control over when the headers, messages and trailers are
   * returned from the server to the client.
   *
   * @returns {this}
   */
  withManualTrigger() {
    this.autoTrigger = false;
    return this;
  }

  /**
   * build constructs and returns the FakeTransport instance.
   * @returns {TriggerableTransport}
   */
  build(): TriggerableTransport {
    const mock = this;

    const triggers = {
      options: null as (grpc.TransportOptions | null),
      sendHeaders: () => {
        if (!triggers.options) {
          throw new Error("sendHeaders called before transport had been invoked");
        }
        if (mock.preHeadersErrorCode !== null) {
          triggers.options.onHeaders(new grpc.Metadata(), mock.preHeadersErrorCode);
          triggers.options.onEnd();
          return false;
        }
        const headers = mock.headers || new grpc.Metadata();
        triggers.options.onHeaders(headers, 200);
        return true;
      },
      sendMessages: () => {
        if (!triggers.options) {
          throw new Error("sendMessages called before transport had been invoked");
        }
        if (mock.preMessagesError !== null) {
          triggers.options.onHeaders(new grpc.Metadata({ "grpc-status": String(mock.preMessagesError[0]), "grpc-message": mock.preMessagesError[1] }), 200);
          triggers.options.onEnd();
          return false;
        }

        mock.messages.forEach(message => {
          triggers.options!.onChunk(frameResponse(message));
        });
        return true;
      },
      sendTrailers: () => {
        if (!triggers.options) {
          throw new Error("sendTrailers called before transport had been invoked");
        }
        if (mock.preTrailersError !== null) {
          triggers.options.onChunk(frameTrailers(new grpc.Metadata({ "grpc-status": String(mock.preTrailersError[0]), "grpc-message": mock.preTrailersError[1] })));
          triggers.options.onEnd();
          return false;
        }

        const trailers = mock.trailers ? mock.trailers : new grpc.Metadata();

        // Explicit status OK
        trailers.set("grpc-status", "0");
        triggers.options.onChunk(frameTrailers(trailers));
        triggers.options.onEnd();
        return true;
      },
      sendAll: () => {
        if (!triggers.options) {
          throw new Error("sendAll called before transport had been invoked");
        }
        if (triggers.sendHeaders()) {
          if (triggers.sendMessages()) {
            triggers.sendTrailers();
          }
        }
      },
    };

    const transportConstructor = (optionsArg: grpc.TransportOptions) => {
      triggers.options = optionsArg;

      if (mock.requestListener) {
        mock.requestListener(optionsArg);
      }

      return {
        start: (metadata: grpc.Metadata) => {
          if (mock.headersListener) {
            mock.headersListener(metadata);
          }
        },
        sendMessage: (msgBytes: ArrayBufferView) => {
          if (mock.messageListener) {
            mock.messageListener(msgBytes);
          }
        },
        finishSend: () => {
          if (mock.finishSendListener) {
            mock.finishSendListener();
          }
          if (mock.autoTrigger) {
            triggers.sendAll();
          }
        },
        cancel: () => {
          if (mock.cancelListener) {
            mock.cancelListener();
          }
        },
      };
    };

    return assignIn(transportConstructor, triggers);
  }
}

export interface TriggerableTransport extends grpc.TransportFactory {
  sendHeaders(): boolean;
  sendMessages(): boolean;
  sendTrailers(): boolean;
  sendAll(): void;
}
