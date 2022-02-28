import {Metadata} from "../metadata";
import {MethodDefinition} from "../service";
import {ProtobufMessage} from "../message";
import { WebsocketChannelTransport } from "./websocket/websocketChannel";

export interface Transport {
  sendMessage(msgBytes: Uint8Array): void
  finishSend(): void
  cancel(): void
  start(metadata: Metadata): void
}

let defaultTransportFactory: TransportFactory = options => WebsocketChannelTransport()(options);

export function setDefaultTransportFactory(t: TransportFactory): void {
  defaultTransportFactory = t;
}

export function makeDefaultTransport(options: TransportOptions): Transport {
  return defaultTransportFactory(options);
}

export interface TransportOptions {
  methodDefinition: MethodDefinition<ProtobufMessage, ProtobufMessage>;
  debug: boolean;
  url: string;
  onHeaders: (headers: Metadata, status: number) => void;
  onChunk: (chunkBytes: Uint8Array, flush?: boolean) => void;
  onEnd: (err?: Error) => void;
}

export interface TransportFactory {
  (options: TransportOptions): Transport;
}
