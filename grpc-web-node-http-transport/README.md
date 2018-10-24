# grpc-web-node-http-transport
Node HTTP Transport for use with [grpc-web-client](https://github.com/improbable-eng/grpc-web)

## Usage
When making a gprc request, specify this transport:

```
import { grpc } from 'grpc-web-client';
import { NodeHttpTransport } from 'grpc-web-node-http-transport';

grpc.invoke(MyService.DoQuery, {
  host: "https://example.com",
  transport: NodeHttpTransport(),
  /* ... */
})
```
