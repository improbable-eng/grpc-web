import {Code} from "./Code";
import {TransportConstructor} from "./transports/Transport";
import {MethodDefinition} from "./service";
import {Metadata} from "./metadata";
import {client} from "./client";
import {ProtobufMessage} from "./message";

export interface Request {
  close: () => void;
}

export interface InvokeRpcOptions<TRequest extends ProtobufMessage, TResponse extends ProtobufMessage> {
  host: string;
  request: TRequest;
  metadata?: Metadata.ConstructorArg;
  onHeaders?: (headers: Metadata) => void;
  onMessage?: (res: TResponse) => void;
  onEnd: (code: Code, message: string, trailers: Metadata) => void;
  transport?: TransportConstructor;
  debug?: boolean;
}


export function invoke<TRequest extends ProtobufMessage, TResponse extends ProtobufMessage, M extends MethodDefinition<TRequest, TResponse>>(methodDescriptor: M, props: InvokeRpcOptions<TRequest, TResponse>): Request {
  if (methodDescriptor.requestStream) {
    throw new Error(".invoke cannot be used with client-streaming methods. Use .client instead.");
  }

  // client can throw an error if the transport factory returns an error (e.g. no valid transport)
  const grpcClient = client(methodDescriptor, {
    host: props.host,
    transport: props.transport,
    debug: props.debug,
  });

  if (props.onHeaders) {
    grpcClient.onHeaders(props.onHeaders);
  }
  if (props.onMessage) {
    grpcClient.onMessage(props.onMessage);
  }
  if (props.onEnd) {
    grpcClient.onEnd(props.onEnd);
  }

  grpcClient.start(props.metadata);
  grpcClient.send(props.request);

  return {
    close: () => {
      grpcClient.close();
    }
  };
}
