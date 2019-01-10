import {ProtobufMessage, ProtobufMessageClass} from "./message";

export interface ServiceDefinition {
  serviceName: string;
}

export interface MethodDefinition<TRequest extends ProtobufMessage, TResponse extends ProtobufMessage> {
  methodName: string;
  service: ServiceDefinition;
  requestStream: boolean;
  responseStream: boolean;
  requestType: ProtobufMessageClass<TRequest>;
  responseType: ProtobufMessageClass<TResponse>;
}

export interface UnaryMethodDefinition<TRequest extends ProtobufMessage, TResponse extends ProtobufMessage> extends MethodDefinition<TRequest, TResponse> {
  requestStream: false;
  responseStream: false;
}
