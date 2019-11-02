import {Metadata} from "./metadata";
import {MethodDefinition} from "./service";
import {ProtobufMessage} from "./message";

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

export interface Transport {
    sendMessage(msgBytes: Uint8Array): void
    finishSend(): void
    cancel(): void
    start(metadata: Metadata): void
}

class NullTransport implements Transport {
    cancel(): void {
        throw new Error("No transport configured")
    }

    finishSend(): void {
        throw new Error("No transport configured")
    }

    sendMessage(_: Uint8Array): void {
        throw new Error("No transport configured")
    }

    start(_: Metadata): void {
        throw new Error("No transport configured")
    }
}

let defaultTransportFactory: TransportFactory = (_: TransportOptions) => new NullTransport();

export function setDefaultTransportFactory(t: TransportFactory): void {
    defaultTransportFactory = t;
}

export function makeDefaultTransport(options: TransportOptions): Transport {
    return defaultTransportFactory(options);
}