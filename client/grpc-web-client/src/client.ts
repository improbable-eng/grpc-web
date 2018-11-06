import {Metadata} from "./metadata";
import {ChunkParser, Chunk, ChunkType} from "./ChunkParser";
import {Code, httpStatusToCode} from "./Code";
import {debug} from "./debug";
import detach from "./detach";
import {Transport, TransportFactory, makeDefaultTransport} from "./transports/Transport";
import {MethodDefinition} from "./service";
import {frameRequest} from "./util";
import {ProtobufMessage} from "./message";

export interface RpcOptions {
  transport?: TransportFactory;
  debug?: boolean;
}

export interface ClientRpcOptions extends RpcOptions {
  host: string;
}

export interface Client<TRequest extends ProtobufMessage, TResponse extends ProtobufMessage> {
  start(metadata?: Metadata.ConstructorArg): void;
  send(message: TRequest): void;
  finishSend(): void;
  close(): void;

  onHeaders(callback: (headers: Metadata) => void): void;
  onMessage(callback: (message: TResponse) => void): void;
  onEnd(callback: (code: Code, message: string, trailers: Metadata) => void): void;
}

export function client<TRequest extends ProtobufMessage, TResponse extends ProtobufMessage, M extends MethodDefinition<TRequest, TResponse>>(methodDescriptor: M, props: ClientRpcOptions): Client<TRequest, TResponse> {
  return new GrpcClient<TRequest, TResponse, M>(methodDescriptor, props);
}

class GrpcClient<TRequest extends ProtobufMessage, TResponse extends ProtobufMessage, M extends MethodDefinition<TRequest, TResponse>> {
  methodDefinition: M;
  props: ClientRpcOptions;

  started: boolean = false;
  sentFirstMessage: boolean = false;
  completed: boolean = false;
  closed: boolean = false;
  finishedSending: boolean = false;

  onHeadersCallbacks: Array<(headers: Metadata) => void> = [];
  onMessageCallbacks: Array<(res: TResponse) => void> = [];
  onEndCallbacks: Array<(code: Code, message: string, trailers: Metadata) => void> = [];

  transport: Transport;
  parser = new ChunkParser();

  responseHeaders: Metadata;
  responseTrailers: Metadata;

  constructor(methodDescriptor: M, props: ClientRpcOptions) {
    this.methodDefinition = methodDescriptor;
    this.props = props;

    this.createTransport();
  }

  createTransport() {
    const url = `${this.props.host}/${this.methodDefinition.service.serviceName}/${this.methodDefinition.methodName}`;
    const transportOptions = {
      methodDefinition: this.methodDefinition,
      debug: this.props.debug || false,
      url: url,
      onHeaders: this.onTransportHeaders.bind(this),
      onChunk: this.onTransportChunk.bind(this),
      onEnd: this.onTransportEnd.bind(this),
    };

    if (this.props.transport) {
      this.transport = this.props.transport(transportOptions);
    } else {
      this.transport = makeDefaultTransport(transportOptions);
    }
  }

  onTransportHeaders(headers: Metadata, status: number) {
    this.props.debug && debug("onHeaders", headers, status);

    if (this.closed) {
      this.props.debug && debug("grpc.onHeaders received after request was closed - ignoring");
      return;
    }

    if (status === 0) {
      // The request has failed due to connectivity issues. Do not capture the headers
    } else {
      this.responseHeaders = headers;
      this.props.debug && debug("onHeaders.responseHeaders", JSON.stringify(this.responseHeaders, null, 2));

      const gRPCStatus = getStatusFromHeaders(headers);
      this.props.debug && debug("onHeaders.gRPCStatus", gRPCStatus);

      const code = gRPCStatus && gRPCStatus >= 0 ? gRPCStatus : httpStatusToCode(status);
      this.props.debug && debug("onHeaders.code", code);

      const gRPCMessage = headers.get("grpc-message") || [];
      this.props.debug && debug("onHeaders.gRPCMessage", gRPCMessage);

      this.rawOnHeaders(headers);

      if (code !== Code.OK) {
        const statusMessage = this.decodeGRPCStatus(gRPCMessage[0]);
        this.rawOnError(code, statusMessage, headers);
      }
    }
  }

  onTransportChunk(chunkBytes: Uint8Array) {
    if (this.closed) {
      this.props.debug && debug("grpc.onChunk received after request was closed - ignoring");
      return;
    }

    let data: Chunk[] = [];
    try {
      data = this.parser.parse(chunkBytes);
    } catch (e) {
      this.props.debug && debug("onChunk.parsing error", e, e.message);
      this.rawOnError(Code.Internal, `parsing error: ${e.message}`);
      return;
    }

    data.forEach((d: Chunk) => {
      if (d.chunkType === ChunkType.MESSAGE) {
        const deserialized = this.methodDefinition.responseType.deserializeBinary(d.data!);
        this.rawOnMessage(deserialized);
      } else if (d.chunkType === ChunkType.TRAILERS) {
        if (!this.responseHeaders) {
          this.responseHeaders = new Metadata(d.trailers);
          this.rawOnHeaders(this.responseHeaders);
        } else {
          this.responseTrailers = new Metadata(d.trailers);
          this.props.debug && debug("onChunk.trailers", this.responseTrailers);
        }
      }
    });
  }

  onTransportEnd() {
    this.props.debug && debug("grpc.onEnd");

    if (this.closed) {
      this.props.debug && debug("grpc.onEnd received after request was closed - ignoring");
      return;
    }

    if (this.responseTrailers === undefined) {
      if (this.responseHeaders === undefined) {
        // The request was unsuccessful - it did not receive any headers
        this.rawOnError(Code.Unknown, "Response closed without headers");
        return;
      }

      const grpcStatus = getStatusFromHeaders(this.responseHeaders);
      const grpcMessage = this.responseHeaders.get("grpc-message");

      // This was a headers/trailers-only response
      this.props.debug && debug("grpc.headers only response ", grpcStatus, grpcMessage);

      if (grpcStatus === null) {
        this.rawOnEnd(Code.Unknown, "Response closed without grpc-status (Headers only)", this.responseHeaders);
        return;
      }

      // Return an empty trailers instance
      const statusMessage = this.decodeGRPCStatus(grpcMessage[0]);
      this.rawOnEnd(grpcStatus, statusMessage, this.responseHeaders);
      return;
    }

    // There were trailers - get the status from them
    const grpcStatus = getStatusFromHeaders(this.responseTrailers);
    if (grpcStatus === null) {
      this.rawOnError(Code.Internal, "Response closed without grpc-status (Trailers provided)");
      return;
    }

    const grpcMessage = this.responseTrailers.get("grpc-message");
    const statusMessage = this.decodeGRPCStatus(grpcMessage[0]);
    this.rawOnEnd(grpcStatus, statusMessage, this.responseTrailers);
  }

  decodeGRPCStatus(src: string | undefined): string {
    if (src) {
      try {
        return decodeURIComponent(src)
      } catch (err) {
        return src
      }
    } else {
      return ""
    }
  }

  rawOnEnd(code: Code, message: string, trailers: Metadata) {
    this.props.debug && debug("rawOnEnd", code, message, trailers);
    if (this.completed) return;
    this.completed = true;

    this.onEndCallbacks.forEach(callback => {
      detach(() => {
        if (this.closed) return;
        callback(code, message, trailers);
      });
    });
  }

  rawOnHeaders(headers: Metadata) {
    this.props.debug && debug("rawOnHeaders", headers);
    if (this.completed) return;
    this.onHeadersCallbacks.forEach(callback => {
      detach(() => {
        callback(headers);
      });
    });
  }

  rawOnError(code: Code, msg: string, trailers: Metadata = new Metadata()) {
    this.props.debug && debug("rawOnError", code, msg);
    if (this.completed) return;
    this.completed = true;
    this.onEndCallbacks.forEach(callback => {
      detach(() => {
        if (this.closed) return;
        callback(code, msg, trailers);
      });
    });
  }

  rawOnMessage(res: TResponse) {
    this.props.debug && debug("rawOnMessage", res.toObject());
    if (this.completed || this.closed) return;
    this.onMessageCallbacks.forEach(callback => {
      detach(() => {
        if (this.closed) return;
        callback(res);
      });
    });
  }

  onHeaders(callback: (headers: Metadata) => void) {
    this.onHeadersCallbacks.push(callback);
  }

  onMessage(callback: (res: TResponse) => void) {
    this.onMessageCallbacks.push(callback);
  }

  onEnd(callback: (code: Code, message: string, trailers: Metadata) => void) {
    this.onEndCallbacks.push(callback);
  }

  start(metadata?: Metadata.ConstructorArg) {
    if (this.started) {
      throw new Error("Client already started - cannot .start()");
    }
    this.started = true;

    const requestHeaders = new Metadata(metadata ? metadata : {});
    requestHeaders.set("content-type", "application/grpc-web+proto");
    requestHeaders.set("x-grpc-web", "1"); // Required for CORS handling

    this.transport.start(requestHeaders);
  }

  send(msg: TRequest) {
    if (!this.started) {
      throw new Error("Client not started - .start() must be called before .send()");
    }
    if (this.closed) {
      throw new Error("Client already closed - cannot .send()");
    }
    if (this.finishedSending) {
      throw new Error("Client already finished sending - cannot .send()");
    }
    if (!this.methodDefinition.requestStream && this.sentFirstMessage) {
      // This is a unary method and the first and only message has been sent
      throw new Error("Message already sent for non-client-streaming method - cannot .send()");
    }
    this.sentFirstMessage = true;
    const msgBytes = frameRequest(msg);
    this.transport.sendMessage(msgBytes);
  }

  finishSend() {
    if (!this.started) {
      throw new Error("Client not started - .finishSend() must be called before .close()");
    }
    if (this.closed) {
      throw new Error("Client already closed - cannot .send()");
    }
    if (this.finishedSending) {
      throw new Error("Client already finished sending - cannot .finishSend()");
    }
    this.finishedSending = true;
    this.transport.finishSend();
  }

  close() {
    if (!this.started) {
      throw new Error("Client not started - .start() must be called before .close()");
    }
    if (!this.closed) {
      this.closed = true;
      this.props.debug && debug("request.abort aborting request");
      this.transport.cancel();
    } else {
      throw new Error("Client already closed - cannot .close()");
    }
  }
}

function getStatusFromHeaders(headers: Metadata): Code | null {
  const fromHeaders = headers.get("grpc-status") || [];
  if (fromHeaders.length > 0) {
    try {
      const asString = fromHeaders[0];
      return parseInt(asString, 10);
    } catch (e) {
      return null;
    }
  }
  return null;
}
