import * as jspb from "google-protobuf";
import {BrowserHeaders} from "browser-headers";
import {ChunkParser, Chunk, ChunkType} from "./ChunkParser";
import {Transport,DefaultTransportFactory} from "./transports/Transport";
import {debug} from "./debug";

export {
  BrowserHeaders,
  Transport
};

export namespace grpc {

  export interface ProtobufMessageClass<T extends jspb.Message> {
    new(): T;
    deserializeBinary(bytes: Uint8Array): T;
  }

  export enum Code {
    OK = 0,
    Canceled = 1,
    Unknown = 2,
    InvalidArgument = 3,
    DeadlineExceeded = 4,
    NotFound = 5,
    AlreadyExists = 6,
    PermissionDenied = 7,
    ResourceExhausted = 8,
    FailedPrecondition = 9,
    Aborted = 10,
    OutOfRange = 11,
    Unimplemented = 12,
    Internal = 13,
    Unavailable = 14,
    DataLoss = 15,
    Unauthenticated = 16,
  }

  function httpStatusToCode(httpStatus: number): Code {
    switch (httpStatus) {
      case 0: // Connectivity issues
        return Code.Internal;
      case 200:
        return Code.OK;
      case 400:
        return Code.InvalidArgument;
      case 401:
        return Code.Unauthenticated;
      case 403:
        return Code.PermissionDenied;
      case 404:
        return Code.NotFound;
      case 409:
        return Code.Aborted;
      case 412:
        return Code.FailedPrecondition;
      case 429:
        return Code.ResourceExhausted;
      case 499:
        return Code.Canceled;
      case 500:
        return Code.Unknown;
      case 501:
        return Code.Unimplemented;
      case 503:
        return Code.Unavailable;
      case 504:
        return Code.DeadlineExceeded;
      default:
        return Code.Unknown;
    }
  }

  export interface ServiceDefinition {
    serviceName: string;
  }

  export interface MethodDefinition<TRequest extends jspb.Message, TResponse extends jspb.Message> {
    methodName: string;
    service: ServiceDefinition;
    requestStream: boolean;
    responseStream: boolean;
    requestType: ProtobufMessageClass<TRequest>;
    responseType: ProtobufMessageClass<TResponse>;
  }

  export interface UnaryMethodDefinition<TRequest extends jspb.Message, TResponse extends jspb.Message> extends MethodDefinition<TRequest, TResponse> {
    responseStream: false;
  }

  export type RpcOptions<TRequest extends jspb.Message, TResponse extends jspb.Message> = {
    host: string,
    request: TRequest,
    metadata?: BrowserHeaders.ConstructorArg,
    onHeaders?: (headers: BrowserHeaders) => void,
    onMessage?: (res: TResponse) => void,
    onEnd: (code: Code, message: string, trailers: BrowserHeaders) => void,
    transport?: Transport,
    debug?: boolean,
  }

  export type UnaryOutput<TResponse> = {
    status: Code,
    statusMessage: string;
    headers: BrowserHeaders;
    message: TResponse | null;
    trailers: BrowserHeaders;
  }

  export type UnaryRpcOptions<M extends UnaryMethodDefinition<TRequest, TResponse>, TRequest extends jspb.Message, TResponse extends jspb.Message> = {
    host: string,
    request: TRequest,
    metadata?: BrowserHeaders.ConstructorArg,
    onEnd: (output: UnaryOutput<TResponse>) => void,
    transport?: Transport,
    debug?: boolean,
  }

  function frameRequest(request: jspb.Message): ArrayBufferView {
    const bytes = request.serializeBinary();
    const frame = new ArrayBuffer(bytes.byteLength + 5);
    new DataView(frame, 1, 4).setUint32(0, bytes.length, false /* big endian */);
    new Uint8Array(frame, 5).set(bytes);
    return new Uint8Array(frame);
  }

  function getStatusFromHeaders(headers: BrowserHeaders): Code | null {
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

  export function unary<TRequest extends jspb.Message, TResponse extends jspb.Message, M extends UnaryMethodDefinition<TRequest, TResponse>>(methodDescriptor: M, props: UnaryRpcOptions<M, TRequest, TResponse>) {
    if (methodDescriptor.responseStream) {
      throw new Error(".unary cannot be used with server-streaming methods. Use .invoke instead.");
    }
    let responseHeaders: BrowserHeaders | null = null;
    let responseMessage: TResponse | null = null;
    const rpcOpts: RpcOptions<TRequest, TResponse> = {
      host: props.host,
      request: props.request,
      metadata: props.metadata,
      onHeaders: (headers: BrowserHeaders) => {
        responseHeaders = headers;
      },
      onMessage: (res: TResponse) => {
        responseMessage = res;
      },
      onEnd: (status: Code, statusMessage: string, trailers: BrowserHeaders) => {
        props.onEnd({
          status: status,
          statusMessage: statusMessage,
          headers: responseHeaders ? responseHeaders : new BrowserHeaders(),
          message: responseMessage,
          trailers: trailers
        });
      },
      transport: props.transport,
      debug: props.debug,
    };
    grpc.invoke(methodDescriptor, rpcOpts);
  }

  export function invoke<TRequest extends jspb.Message, TResponse extends jspb.Message, M extends MethodDefinition<TRequest, TResponse>>(methodDescriptor: M, props: RpcOptions<TRequest, TResponse>) {
    const requestHeaders = new BrowserHeaders(props.metadata ? props.metadata : {});
    requestHeaders.set("content-type", "application/grpc-web");
    requestHeaders.set("x-grpc-web", "1"); // Required for CORS handling

    const framedRequest = frameRequest(props.request);

    let completed = false;
    function rawOnEnd(code: Code, message: string, trailers: BrowserHeaders) {
      if (completed) return;
      completed = true;
      props.onEnd(code, message, trailers);
    }

    function rawOnHeaders(headers: BrowserHeaders) {
      if (completed) return;
      if (props.onHeaders) {
        props.onHeaders(headers);
      }
    }

    function rawOnError(code: Code, msg: string) {
      if (completed) return;
      completed = true;
      props.onEnd(code, msg, new BrowserHeaders());
    }

    function rawOnMessage(res: TResponse) {
      if (completed) return;
      if (props.onMessage) {
        props.onMessage(res);
      }
    }

    let responseHeaders: BrowserHeaders;
    let responseTrailers: BrowserHeaders;
    const parser = new ChunkParser();


    let transport = props.transport;
    if (!transport) {
      transport = DefaultTransportFactory.getTransport();
    }
    transport({
      debug: props.debug || false,
      url: `${props.host}/${methodDescriptor.service.serviceName}/${methodDescriptor.methodName}`,
      headers: requestHeaders,
      body: framedRequest,
      onHeaders: (headers: BrowserHeaders, status: number) => {
        props.debug && debug("onHeaders", headers, status);
        if (status === 0) {
          // The request has failed due to connectivity issues. Do not capture the headers
        } else {
          responseHeaders = headers;
          props.debug && debug("onHeaders.responseHeaders", JSON.stringify(responseHeaders, null, 2));
          const code = httpStatusToCode(status);
          props.debug && debug("onHeaders.code", code);
          const gRPCMessage = headers.get("grpc-message") || [];
          props.debug && debug("onHeaders.gRPCMessage", gRPCMessage);
          if (code !== Code.OK) {
            rawOnError(code, gRPCMessage[0]);
            return;
          }

          rawOnHeaders(headers);
        }
      },
      onChunk: (chunkBytes: Uint8Array) => {
        let data: Chunk[] = [];
        try {
          data = parser.parse(chunkBytes);
        } catch (e) {
          props.debug && debug("onChunk.parsing error", e, e.message);
          rawOnError(Code.Internal, `parsing error: ${e.message}`);
          return;
        }

        data.forEach((d: Chunk) => {
          if (d.chunkType === ChunkType.MESSAGE) {
            const deserialized = methodDescriptor.responseType.deserializeBinary(d.data!);
            rawOnMessage(deserialized);
          } else if (d.chunkType === ChunkType.TRAILERS) {
            props.debug && debug("onChunk.trailers", responseTrailers);
            responseTrailers = new BrowserHeaders(d.trailers);
          }
        });
      },
      onEnd: () => {
        props.debug && debug("grpc.onEnd");

        if (responseTrailers === undefined) {
          if (responseHeaders === undefined) {
            // The request was unsuccessful - it did not receive any headers
            rawOnError(Code.Internal, "Response closed without headers");
            return;
          }

          const grpcStatus = getStatusFromHeaders(responseHeaders);
          const grpcMessage = responseHeaders.get("grpc-message");

          // This was a headers/trailers-only response
          props.debug && debug("grpc.headers only response ", grpcStatus, grpcMessage);

          if (grpcStatus === null) {
            rawOnEnd(Code.Internal, "Response closed without grpc-status (Headers only)", responseHeaders);
            return;
          }

          // Return an empty trailers instance
          rawOnEnd(grpcStatus, grpcMessage[0], responseHeaders);
          return;
        }

        // There were trailers - get the status from them
        const grpcStatus = getStatusFromHeaders(responseTrailers);
        if (grpcStatus === null) {
          rawOnError(Code.Internal, "Response closed without grpc-status (Trailers provided)");
          return;
        }

        const grpcMessage = responseTrailers.get("grpc-message");
        rawOnEnd(grpcStatus, grpcMessage[0], responseTrailers);
      }
    });
  }
}
