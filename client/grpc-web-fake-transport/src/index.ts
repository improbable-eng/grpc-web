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

  withRequestListener(requestListener: (options: grpc.TransportOptions) => void) {
    this.requestListener = requestListener;
    return this;
  }

  withHeadersListener(headersListener: (headers: grpc.Metadata) => void) {
    this.headersListener = headersListener;
    return this;
  }

  withMessageListener(messageListener: (messageBytes: ArrayBufferView) => void) {
    this.messageListener = messageListener;
    return this;
  }

  withFinishSendListener(finishSendListener: () => void) {
    this.finishSendListener = finishSendListener;
    return this;
  }

  withCancelListener(cancelListener: () => void) {
    this.cancelListener = cancelListener;
    return this;
  }

  withPreHeadersError(httpCode: number) {
    this.preHeadersErrorCode = httpCode;
    return this;
  }

  withHeaders(headers: grpc.Metadata) {
    this.headers = headers;
    return this;
  }

  withPreMessagesError(grpcStatus: grpc.Code, grpcMessage: string) {
    this.preMessagesError = [grpcStatus, grpcMessage];
    return this;
  }

  withMessages(messages: Array<Message>) {
    this.messages = messages;
    return this;
  }

  withPreTrailersError(grpcStatus: grpc.Code, grpcMessage: string) {
    this.preTrailersError = [grpcStatus, grpcMessage];
    return this;
  }

  withTrailers(trailers: grpc.Metadata) {
    this.trailers = trailers;
    return this;
  }

  withManualTrigger() {
    this.autoTrigger = false;
    return this;
  }

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
          if (mock.autoTrigger) {
            triggers.sendAll();
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
        },
        cancel: () => {
          if (mock.cancelListener) {
            mock.cancelListener();
          }
        },
      };
    };

    return assignIn(transportConstructor, triggers) as any; // tslint:disable-line
  }
}

export interface TriggerableTransport extends grpc.TransportFactory {
  sendHeaders(): boolean;
  sendMessages(): boolean;
  sendTrailers(): boolean;
  sendAll(): void;
}