# grpc-web-client
> Library for making gRPC-web requests from a Browser

This library is intended for both JavaScript and TypeScript usage.

## Usage
* Use [`ts-protoc-gen`](https://www.npmjs.com/package/ts-protoc-gen) with [`protoc`](https://github.com/google/protobuf) to generate `.js` and `.d.ts` files for your request and response classes.
* Write your service definitions in the format shown [here](https://github.com/improbable-eng/grpc-web/tree/master/test/ts/src/services.ts) - plugin to generate service definitions coming soon.
* Make a request:
    ```
    import { grpc } from 'grpc-web';

    const ping = new PingRequest();
    ping.setValue("hello world");
    grpc.invoke(TestService.Ping, {
      request: ping,
      host: "https://example.com",
      onHeaders: function(headers: BrowserHeaders) {

      },
      onMessage: function(message: PingResponse) {

      },
      onError: function(err: Error) {

      },
      onComplete: function(code: grpc.Code, msg: string | undefined, trailers: BrowserHeaders) {

      }
    });
    ```
