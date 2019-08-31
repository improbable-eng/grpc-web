import * as impGrpc from "@improbable-eng/grpc-web-core";
import { CrossBrowserHttpTransport } from "@improbable-eng/grpc-web-cross-browser-transport";
import {TransportOptions} from "@improbable-eng/grpc-web-core";

// Export under the `grpc` namespace for easy consumption.
export namespace grpc {
  export interface ProtobufMessageClass<T extends impGrpc.ProtobufMessage> extends impGrpc.ProtobufMessageClass<T> {}
  export interface ProtobufMessage extends impGrpc.ProtobufMessage {}
  export interface ServiceDefinition extends impGrpc.ServiceDefinition {}

  export interface Transport extends impGrpc.Transport {}
  export interface TransportOptions extends impGrpc.TransportOptions {}
  export interface TransportFactory extends impGrpc.TransportFactory {}

  export interface UnaryMethodDefinition<TRequest extends impGrpc.ProtobufMessage, TResponse extends impGrpc.ProtobufMessage> extends impGrpc.UnaryMethodDefinition<TRequest, TResponse> {}
  export interface MethodDefinition<TRequest extends ProtobufMessage, TResponse extends impGrpc.ProtobufMessage> extends impGrpc.MethodDefinition<TRequest, TResponse> {}
  export interface RpcOptions extends impGrpc.RpcOptions {}
  export interface Client<TRequest extends ProtobufMessage, TResponse extends ProtobufMessage> extends impGrpc.Client<TRequest, TResponse> {}
  export interface ClientRpcOptions extends impGrpc.ClientRpcOptions {}
  export interface Request extends impGrpc.Request {}
  export interface InvokeRpcOptions<TRequest extends ProtobufMessage, TResponse extends ProtobufMessage> extends impGrpc.InvokeRpcOptions<TRequest, TResponse> {}
  export interface UnaryOutput<TResponse extends ProtobufMessage> extends impGrpc.UnaryOutput<TResponse> {}
  export interface UnaryRpcOptions<TRequest extends ProtobufMessage, TResponse extends ProtobufMessage> extends impGrpc.UnaryRpcOptions<TRequest, TResponse> {}

  export import Code = impGrpc.Code;
  export import Metadata = impGrpc.Metadata;
  export import setDefaultTransport = impGrpc.setDefaultTransportFactory;
  export import invoke = impGrpc.invoke;
  export import unary = impGrpc.unary;

  export function client<TRequest extends ProtobufMessage, TResponse extends ProtobufMessage, M extends MethodDefinition<TRequest, TResponse>>(methodDescriptor: M, props: impGrpc.ClientRpcOptions): Client<TRequest, TResponse> {
    return impGrpc.client(methodDescriptor, props);
  }


}

// Configure grpc-web to use one of the native browser transports (typically fetch, or XHR based) so that it works
// "out of the box" for new users.
const defaultCrossBrowserTransportFactory = (options: TransportOptions) => {
  return CrossBrowserHttpTransport({ withCredentials: false })(options);
};
grpc.setDefaultTransport(defaultCrossBrowserTransportFactory);