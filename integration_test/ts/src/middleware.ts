import {grpc} from "grpc-web-client";

export class TestMiddleware implements grpc.Middleware<any, any> {

  public calls: {
    descriptor?: any;
    props?: any;
    onClose?: boolean;
    onEnd?: [grpc.Code, string, grpc.Metadata];
    onFinishSend?: boolean;
    onHeaders?: grpc.Metadata;
    onMessage?: any;
    onSend?: any;
    onStart?: grpc.Metadata;
  };

  constructor(descriptor: any, props: any) {
    this.calls = {descriptor, props};
  }

  onClose(): undefined {
    this.calls.onClose = true;
    return undefined;
  }

  onEnd(status: grpc.Code, statusMessage: string, trailers: grpc.Metadata): undefined {
    this.calls.onEnd = [status, statusMessage, trailers];
    return undefined;
  }

  onFinishSend(): undefined {
    this.calls.onFinishSend = true;
    return undefined;
  }

  onHeaders(headers: grpc.Metadata): undefined {
    this.calls.onHeaders = headers;
    return undefined;
  }

  onMessage(response: any): undefined {
    this.calls.onMessage = response;
    return undefined;
  }

  onSend(message: any): undefined {
    this.calls.onSend = message;
    return undefined;
  }

  onStart(metadata: grpc.Metadata): undefined {
    this.calls.onStart = metadata;
    return undefined;
  }

}
