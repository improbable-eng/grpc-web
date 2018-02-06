import {Metadata} from "../metadata";
import fetchRequest, {detectFetchSupport} from "./fetch";
import xhrRequest, {detectXHRSupport} from "./xhr";
import mozXhrRequest, {detectMozXHRSupport} from "./mozXhr";
import httpNodeRequest, {detectNodeHTTPSupport} from "./nodeHttp";
import {MethodDefinition} from "../service";
import {ProtobufMessage} from "../message";

export interface Transport {
  sendMessage(msgBytes: ArrayBufferView): void
  finishSend(): void
  cancel(): void
  start(metadata: Metadata): void
}

export interface TransportConstructor {
  (options: TransportOptions): Transport | Error;
}

export interface TransportOptions {
  methodDefinition: MethodDefinition<ProtobufMessage, ProtobufMessage>;
  debug: boolean;
  url: string;
  onHeaders: (headers: Metadata, status: number) => void;
  onChunk: (chunkBytes: Uint8Array, flush?: boolean) => void;
  onEnd: (err?: Error) => void;
}

let selectedTransport: TransportConstructor;
export function DefaultTransportFactory(transportOptions: TransportOptions): Transport | Error {
  // The transports provided by DefaultTransportFactory do not support client-streaming
  if (transportOptions.methodDefinition.requestStream) {
    return new Error("No transport available for client-streaming (requestStream) method");
  }

  if (!selectedTransport) {
    selectedTransport = detectTransport();
  }

  return selectedTransport(transportOptions);
}

function detectTransport(): TransportConstructor {
  if (detectFetchSupport()) {
    return fetchRequest;
  }

  if (detectMozXHRSupport()) {
    return mozXhrRequest;
  }

  if (detectXHRSupport()) {
    return xhrRequest;
  }

  if (detectNodeHTTPSupport()) {
    return httpNodeRequest;
  }

  throw new Error("No suitable transport found for gRPC-Web");
}
