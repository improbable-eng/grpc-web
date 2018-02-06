import {BrowserHeaders} from "browser-headers";
import * as impTransport from "./transports/Transport";
import * as impCode from "./Code";
import * as impInvoke from "./invoke";
import * as impUnary from "./unary";
import * as impClient from "./client";
import * as impService from "./service";
import * as impMessage from "./message";

export namespace grpc {
  export interface ProtobufMessageClass<T extends ProtobufMessage> extends impMessage.ProtobufMessageClass<T>{}
  export interface ProtobufMessage extends impMessage.ProtobufMessage{}

  export interface Transport extends impTransport.Transport{}
  export interface TransportOptions extends impTransport.TransportOptions{}
  export interface TransportConstructor extends impTransport.TransportConstructor{}
  export const DefaultTransportFactory = impTransport.DefaultTransportFactory;

  export interface UnaryMethodDefinition<TRequest extends ProtobufMessage, TResponse extends ProtobufMessage> extends impService.UnaryMethodDefinition<TRequest, TResponse>{}
  export interface MethodDefinition<TRequest extends ProtobufMessage, TResponse extends ProtobufMessage> extends impService.MethodDefinition<TRequest, TResponse>{}
  export interface ServiceDefinition extends impService.ServiceDefinition{}

  export import Code = impCode.Code;
  export import Metadata = BrowserHeaders;

  export interface Client<TRequest extends ProtobufMessage, TResponse extends ProtobufMessage> extends impClient.Client<TRequest, TResponse>{}
  export function client<TRequest extends ProtobufMessage, TResponse extends ProtobufMessage, M extends MethodDefinition<TRequest, TResponse>>(methodDescriptor: M, props: ClientRpcOptions): Client<TRequest, TResponse> {
    return impClient.client(methodDescriptor, props);
  }
  export interface ClientRpcOptions extends impClient.ClientRpcOptions{}

  export const invoke = impInvoke.invoke;
  export interface Request extends impInvoke.Request{}
  export interface InvokeRpcOptions<TRequest extends ProtobufMessage, TResponse extends ProtobufMessage> extends impInvoke.InvokeRpcOptions<TRequest, TResponse>{}

  export const unary = impUnary.unary;
  export interface UnaryOutput<TResponse extends ProtobufMessage> extends impUnary.UnaryOutput<TResponse>{}
  export interface UnaryRpcOptions<TRequest extends ProtobufMessage, TResponse extends ProtobufMessage> extends impUnary.UnaryRpcOptions<TRequest, TResponse>{}
}
