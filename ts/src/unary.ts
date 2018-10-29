import {Metadata} from "./metadata";
import {Code} from "./Code";
import {UnaryMethodDefinition} from "./service";
import {Request} from "./invoke";
import {client, RpcOptions} from "./client";
import {ProtobufMessage} from "./message";

export interface UnaryOutput<TResponse> {
  status: Code;
  statusMessage: string;
  headers: Metadata;
  message: TResponse | null;
  trailers: Metadata;
}

export interface UnaryRpcOptions<TRequest extends ProtobufMessage, TResponse extends ProtobufMessage> extends RpcOptions {
  host: string;
  request: TRequest;
  metadata?: Metadata.ConstructorArg;
  onEnd: (output: UnaryOutput<TResponse>) => void;
}

export function unary<TRequest extends ProtobufMessage, TResponse extends ProtobufMessage, M extends UnaryMethodDefinition<TRequest, TResponse>>(methodDescriptor: M, props: UnaryRpcOptions<TRequest, TResponse>): Request {
  if (methodDescriptor.responseStream) {
    throw new Error(".unary cannot be used with server-streaming methods. Use .invoke or .client instead.");
  }
  if (methodDescriptor.requestStream) {
    throw new Error(".unary cannot be used with client-streaming methods. Use .client instead.");
  }
  let responseHeaders: Metadata | null = null;
  let responseMessage: TResponse | null = null;

  // client can throw an error if the transport factory returns an error (e.g. no valid transport)
  const grpcClient = client(methodDescriptor, {
    host: props.host,
    transport: props.transport,
    debug: props.debug,
  });
  grpcClient.onHeaders((headers: Metadata) => {
    responseHeaders = headers;
  });
  grpcClient.onMessage((res: TResponse) => {
    responseMessage = res;
  });
  grpcClient.onEnd((status: Code, statusMessage: string, trailers: Metadata) => {
    props.onEnd({
      status: status,
      statusMessage: statusMessage,
      headers: responseHeaders ? responseHeaders : new Metadata(),
      message: responseMessage,
      trailers: trailers
    });
  });

  grpcClient.start(props.metadata);
  grpcClient.send(props.request);
  grpcClient.finishSend();

  return {
    close: () => {
      grpcClient.close();
    }
  };
}
