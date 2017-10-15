import {Debugger, DebuggerFactory, MessageMethodDefinition, Metadata, Code} from 'grpc-web-client';
import {Message} from 'google-protobuf';

export const ExampleDebuggerFactory: DebuggerFactory = (id: number) => new ExampleDebugger(id);

class ExampleDebugger implements Debugger {
  private id: number;

  constructor(id: number) {
    this.id = id;
  }

  onRequestStart(host: string, method: MessageMethodDefinition): void {
  }

  onRequestHeaders(headers: Metadata): void {
  }

  onRequestMessage(payload: Message): void {
  }

  onResponseHeaders(headers: Metadata, httpStatus: number): void {
  }

  onResponseMessage(payload: Message): void {
  }

  onResponseTrailers(metadata: Metadata): void {
  }

  onResponseEnd(grpcStatus: Code, err: null | Error): void {
  }

}