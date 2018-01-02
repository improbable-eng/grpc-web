import {Message} from 'google-protobuf';
import {BrowserHeaders as Metadata} from 'browser-headers';
import {grpc} from './grpc';
import {Chunk} from './ChunkParser';
import {Code} from './Code';
import detach from "./detach";

export function debug(...args: any[]) {
  if (console.debug) {
    console.debug.apply(null, args);
  } else {
    console.log.apply(null, args);
  }
}

export function debugBuffer(str: string, buffer: Uint8Array) {
  const asArray: number[] = [];
  for(let i = 0; i < buffer.length; i++) {
    asArray.push(buffer[i]);
  }
  debug(str, asArray.join(","))
}

export type MessageMethodDefinition = grpc.MethodDefinition<Message, Message>

export interface DebuggerFactory {
  (id: number) : Debugger;
}

// Implements callbacks for grpc-web request/response lifecycle events
export interface Debugger {
  // Called just before a request is fired, called only once
  onRequestStart(host: string, method: MessageMethodDefinition): void;

  // Called just before a request is fired, called only once
  onRequestHeaders(headers: Metadata): void;

  // Called with the request payload, potentially called multiple times with request streams
  onRequestMessage(payload: Message): void;

  // Called when response headers are available, called once multiple times
  // This is a low level method intended to debug byte serialization
  onResponseHeaders(headers: Metadata, httpStatus: number): void;

  // Called with each received chunk
  onResponseChunk?(chunk: Chunk[], chunkBytes: Uint8Array): void;

  // Called with each response message, called multiple times with response streams
  onResponseMessage(payload: Message): void;

  // Called with response trailers, called once
  onResponseTrailers(metadata: Metadata): void;

  // Called when a request completes, called once
  onResponseEnd(grpcStatus: Code, err: null | Error): void;
}

export const ConsoleDebuggerFactory: DebuggerFactory = (id: number) => new ConsoleDebugger(id);

export class ConsoleDebugger implements Debugger {

  private readonly id: number;

  constructor(id: number) {
    this.id = id;
  }

  onRequestStart(host: string, method: MessageMethodDefinition): void {
    debug(`gRPC-Web #${this.id}: Making request to ${host} for ${method.service.serviceName}.${method.methodName}`);
  }

  onRequestHeaders(headers: Metadata): void {
    debug(`gRPC-Web #${this.id}: Headers:`, headers);
  }

  onRequestMessage(payload: Message): void {
    debug(`gRPC-Web #${this.id}: Request message:`, payload.toObject());
  }

  onResponseHeaders(headers: Metadata, httpStatus: number) {
    debug(`gRPC-Web #${this.id}: Response headers:`, headers, 'HTTP Status:', httpStatus);
  }

  onResponseMessage(payload: Message): void {
    debug(`gRPC-Web #${this.id}: Response message:`, payload.toObject());
  }

  onResponseTrailers(metadata: Metadata): void {
    debug(`gRPC-Web #${this.id}: Response trailers:`, metadata);
  }

  onResponseEnd(grpcStatus: Code, err: null | Error): void {
    debug(`gRPC-Web #${this.id}: Finished with status:`, grpcStatus, 'Error:', err);
  }

}

export class DebuggerDispatch implements Debugger {

  readonly debuggers: Debugger[] = [];

  constructor(requestId: number) {
    this.debuggers = [];
    const dbgs = getDebuggers();
    for (let i = 0; i < dbgs.length; i++) {
      try {
        this.debuggers.push(dbgs[i](requestId))
      } catch (e) {
        console && (console.error || console.log) && console.error('Failed to create a debugger. The debugger will be ignored.', e);
      }
    }
  }

  onRequestStart(host: string, method: MessageMethodDefinition): void {
    this.debuggers.forEach(dbg => {
      detach(() => dbg.onRequestStart(host, method));
    });
  }

  onRequestHeaders(headers: Metadata): void {
    this.debuggers.forEach(dbg => {
      detach(() => dbg.onRequestHeaders(headers));
    });
  }

  onRequestMessage(payload: Message): void {
    this.debuggers.forEach(dbg => {
      detach(() => dbg.onRequestMessage(payload));
    });
  }

  onResponseHeaders(headers: Metadata, httpStatus: number): void {
    this.debuggers.forEach(dbg => {
      detach(() => dbg.onResponseHeaders(headers, httpStatus));
    });
  }

  onResponseChunk(chunk: Chunk[], chunkBytes: Uint8Array) {
    this.debuggers.forEach(dbg => {
      detach(() => dbg.onResponseChunk && dbg.onResponseChunk(chunk, chunkBytes));
    });
  }

  onResponseMessage(payload: Message): void {
    this.debuggers.forEach(dbg => {
      detach(() => dbg.onResponseMessage(payload));
    });
  }

  onResponseTrailers(metadata: Metadata): void {
    this.debuggers.forEach(dbg => {
      detach(() => dbg.onResponseTrailers(metadata));
    });
  }

  onResponseEnd(grpcStatus: Code, err: null | Error): void {
    this.debuggers.forEach(dbg => {
      detach(() => dbg.onResponseEnd(grpcStatus, err));
    });
  }

}


// Debugger hooks
const debuggers: DebuggerFactory[] = [];
// A client can register custom debuggers to be called
// during the lifecycle of a request
export function registerDebugger(...debuggerFactory: DebuggerFactory[]) {
  debuggerFactory.forEach(dbg => debuggers.push(dbg));
}

export function removeDebugger(debuggerFactory: DebuggerFactory): boolean {
  const index = debuggers.indexOf(debuggerFactory);
  // debugger not registered
  if (index < 0) return false;

  debuggers.splice(index, 1);
  return true;
}

export function getDebuggers(): DebuggerFactory[] {
  return debuggers;
}