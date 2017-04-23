import * as jspb from "google-protobuf";
import {BrowserHeaders} from "browser-headers";
import {ChunkParser, Chunk, ChunkType} from "./ChunkParser";
import {Transport,DefaultTransportFactory} from "./transports/Transport";
import {debug, debugBuffer} from "./debug";

export {
  BrowserHeaders
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

  export type RpcOptions<TRequest extends jspb.Message, TResponse extends jspb.Message> = {
    host: string,
    request: TRequest,
    headers?: BrowserHeaders.ConstructorArg,
    onHeaders?: (headers: BrowserHeaders) => void,
    onMessage?: (res: TResponse) => void,
    onComplete: (code: Code, message: string | undefined, trailers: BrowserHeaders) => void,
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
        const asNumber = parseInt(asString, 10);
        if (Code[asNumber] === undefined) {
          return null;
        } else {
          return asNumber;
        }
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  export function invoke<TRequest extends jspb.Message, TResponse extends jspb.Message, M extends MethodDefinition<TRequest, TResponse>>(methodDescriptor: M,
                                                                                                                                         props: RpcOptions<TRequest, TResponse>) {
    const requestHeaders = new BrowserHeaders(props.headers ? props.headers : {});
    requestHeaders.set("content-type", "application/grpc-web");
    requestHeaders.set("x-grpc-web", "1"); // Required for CORS handling

    const framedRequest = frameRequest(props.request);

    let completed = false;
    function rawOnComplete(code: Code, message: string | undefined, trailers: BrowserHeaders) {
      if (completed) return;
      completed = true;
      setTimeout(() => {
        props.onComplete(code, message, trailers);
      });
    }

    function rawOnHeaders(headers: BrowserHeaders) {
      if (completed) return;
      setTimeout(() => {
        if (props.onHeaders) {
          props.onHeaders(headers);
        }
      });
    }

    function rawOnError(code: Code, msg: string) {
      if (completed) return;
      completed = true;
      setTimeout(() => {
        props.onComplete(code, msg, new BrowserHeaders());
      });
    }

    function rawOnMessage(res: TResponse) {
      if (completed) return;
      setTimeout(() => {
        if (props.onMessage) {
          props.onMessage(res);
        }
      });
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
      credentials: "",
      onHeaders: (headers: BrowserHeaders, status: number) => {
        props.debug && debug("onHeaders", headers, status);
        responseHeaders = headers;
        props.debug && debug("onHeaders.responseHeaders", JSON.stringify(responseHeaders, null, 2));
        const code = httpStatusToCode(status);
        props.debug && debug("onHeaders.code", code);
        const gRPCMessage = headers.get("grpc-message");
        props.debug && debug("onHeaders.gRPCMessage", gRPCMessage);
        if (code !== Code.OK) {
          rawOnError(code, gRPCMessage.length > 0 ? gRPCMessage[0] : "");
          return;
        }

        rawOnHeaders(headers);
      },
      onChunk: (chunkBytes: Uint8Array) => {
        let data: Chunk[] = [];
        try {
          data = parser.parse(chunkBytes);
        } catch (e) {
          props.debug && debug("onChunk.parsing error", e, e.message);
          rawOnError(Code.Internal, e.message);
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
      onComplete: () => {
        props.debug && debug("grpc.onComplete");

        if (responseTrailers === undefined) {
          if (responseHeaders === undefined) {
            // The request was unsuccessful - it did not receive any headers
            rawOnError(Code.Unknown, "");
            return;
          }

          // This was a headers/trailers-only response
          props.debug && debug("grpc.headers only response");

          const grpcStatus = getStatusFromHeaders(responseHeaders);
          if (grpcStatus === null) {
            rawOnError(Code.Internal, "Response closed without grpc-status (Headers only)");
            return;
          }

          const grpcMessage = responseHeaders.get("grpc-message") || [];
          rawOnComplete(grpcStatus, grpcMessage[0], responseHeaders);
          return;
        }

        // There were trailers - get the status from them
        const grpcStatus = getStatusFromHeaders(responseTrailers);
        if (grpcStatus === null) {
          rawOnError(Code.Internal, "Response closed without grpc-status (Trailers provided)");
          return;
        }

        const grpcMessage = responseTrailers.get("grpc-message");
        rawOnComplete(grpcStatus, grpcMessage ? grpcMessage[0] : "", responseTrailers);
      }
    });
  }
}
