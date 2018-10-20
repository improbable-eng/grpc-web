import {Metadata} from "../metadata";
import fetchRequest, {detectFetchSupport} from "./fetch";
import xhrRequest, {detectXHRSupport} from "./xhr";
import mozXhrRequest, {detectMozXHRSupport} from "./mozXhr";
import httpNodeRequest, {detectNodeHTTPSupport} from "./nodeHttp";
import {MethodDefinition} from "../service";
import {ProtobufMessage} from "../message";
import websocketRequest from "./websocket";

export interface Transport {
  sendMessage(msgBytes: Uint8Array): void
  finishSend(): void
  cancel(): void
  start(metadata: Metadata): void
}

export interface HttpTransportConstructor {
  (options: TransportOptions, config: HttpTransportConfig): Transport;
}

export interface TransportOptions {
  methodDefinition: MethodDefinition<ProtobufMessage, ProtobufMessage>;
  debug: boolean;
  url: string;
  onHeaders: (headers: Metadata, status: number) => void;
  onChunk: (chunkBytes: Uint8Array, flush?: boolean) => void;
  onEnd: (err?: Error) => void;
}

export function DefaultHttpTransport(transportOptions: TransportOptions): Transport {
  return HttpTransport({ credentials: "same-origin" })(transportOptions);
}

function detectHttpTransport(): HttpTransportConstructor {
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

export interface HttpTransportConfig {
  credentials: "include" | "same-origin"
}

export interface TransportFactory {
  (options: TransportOptions): Transport;
}

export function HttpTransport(cfg: HttpTransportConfig): TransportFactory {
  let detectedTransport: HttpTransportConstructor | null = null;
  return (opts: TransportOptions) => {
    if (detectedTransport === null) {
      detectedTransport = detectHttpTransport();
    }
    return detectedTransport(opts, cfg);
  }
}

export function WebsocketTransport(): TransportFactory {
  return (opts: TransportOptions) => {
    return websocketRequest(opts);
  }
}
