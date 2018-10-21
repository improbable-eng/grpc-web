import {Metadata} from "../metadata";
import fetchRequest, {detectFetchSupport, FetchTransportInit} from "./fetch";
import xhrRequest, {XhrTransportInit} from "./xhr";
import mozXhrRequest, {detectMozXHRSupport} from "./mozXhr";
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
  (options: TransportOptions, config: HttpTransportInit): Transport;
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
  return HttpTransport({ withCredentials: false })(transportOptions);
}

export interface HttpTransportInit {
  withCredentials?: boolean
}

export interface TransportFactory {
  (options: TransportOptions): Transport;
}

export function HttpTransport(init: HttpTransportInit): TransportFactory {
  if (detectFetchSupport()) {
    return FetchReadableStreamTransport({ credentials: init.withCredentials ? 'include' : 'same-origin' })
  }
  return XhrTransport({ withCredentials: init.withCredentials });
}

export function XhrTransport(init: XhrTransportInit): TransportFactory {
  return (opts: TransportOptions) => {
    if (detectMozXHRSupport()) {
      return mozXhrRequest(opts, init);
    }
    return xhrRequest(opts, init);
  }
}

export function FetchReadableStreamTransport(init: FetchTransportInit): TransportFactory {
  return (opts: TransportOptions) => {
    return fetchRequest(opts, init);
  }
}

export function WebsocketTransport(): TransportFactory {
  return (opts: TransportOptions) => {
    return websocketRequest(opts);
  }
}
