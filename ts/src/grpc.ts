import * as jspb from "google-protobuf";
import {BrowserHeaders} from "browser-headers";
import {ChunkParser, Chunk, ChunkType} from "./ChunkParser";
import {Transport,DefaultTransportFactory} from "./transports/Transport";

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
    onError: (err: Error) => void,
    transport?: Transport,
    debug?: boolean,
  }

  function frameRequest(request: jspb.Message) {
    const bytes = request.serializeBinary();
    const frame = new ArrayBuffer(bytes.byteLength + 5);
    new DataView(frame, 1, 4).setUint32(0, bytes.length, false /* big endian */);
    new Uint8Array(frame, 5).set(bytes);
    return frame
  }

  function getStatusFromHeaders(trailers: BrowserHeaders): Code | null {
    const fromTrailers = trailers.get("grpc-status") || [];
    if (fromTrailers.length > 0) {
      try {
        const asString = fromTrailers[0];
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

    const framedRequest = frameRequest(props.request);

    let completed = false;
    function rawOnComplete(code: Code, message: string | undefined, trailers: BrowserHeaders) {
      if (completed) return;
      completed = true;
      props.onComplete(code, message, trailers);
    }

    function rawOnHeaders(headers: BrowserHeaders) {
      if (completed) return;
      if (props.onHeaders) {
        props.onHeaders(headers);
      }
    }

    function rawOnError(err: Error) {
      if (completed) return;
      completed = true;
      props.onError(err);
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
      url: `${props.host}/${methodDescriptor.service.serviceName}/${methodDescriptor.methodName}`,
      headers: requestHeaders,
      body: framedRequest,
      credentials: "",
      onHeaders: (headers: BrowserHeaders, status: number) => {
        responseHeaders = headers;
        props.debug && console.debug("onHeaders", headers, status);
        props.debug && console.debug("responseHeaders", JSON.stringify(responseHeaders, null, 2));
        rawOnHeaders(headers);
      },
      onChunk: (chunkBytes: Uint8Array) => {
        props.debug && console.debug("onChunk: ", chunkBytes);

        let data: Chunk[] = [];
        try {
          data = parser.parse(chunkBytes);
        } catch (e) {
          props.onError(e);
          return;
        }

        data.forEach((d: Chunk) => {
          props.debug && console.debug("onChunk ", d);

          if (d.chunkType === ChunkType.MESSAGE) {
            rawOnMessage(methodDescriptor.responseType.deserializeBinary(d.data!));
          } else if (d.chunkType === ChunkType.TRAILERS) {
            responseTrailers = new BrowserHeaders(d.trailers);
          }
        });
      },
      onComplete: () => {
        props.debug && console.debug("grpc.onComplete");

        if (responseTrailers === undefined) {
          if (responseHeaders === undefined) {
            // The request was unsuccessful - it did not receive any headers
            rawOnError(new Error("Response closed without grpc-status (No headers)"));
            return;
          }

          // This was a headers/trailers-only response
          props.debug && console.debug("grpc.headers only response");

          const grpcStatus = getStatusFromHeaders(responseHeaders);
          if (grpcStatus === null) {
            rawOnError(new Error("Response closed without grpc-status (Headers only)"));
            return;
          }

          const grpcMessage = responseHeaders.get("grpc-message") || [];
          rawOnComplete(grpcStatus, grpcMessage[0], responseHeaders);
          return;
        }

        // There were trailers - get the status from them

        const grpcStatus = getStatusFromHeaders(responseTrailers);
        if (grpcStatus === null) {
          rawOnError(new Error("Response closed without grpc-status (Trailers provided)"));
          return;
        }

        const grpcMessage = responseTrailers.get("grpc-message") || [];
        rawOnComplete(grpcStatus, grpcMessage[0], responseTrailers);
      }
    });
  }
}
