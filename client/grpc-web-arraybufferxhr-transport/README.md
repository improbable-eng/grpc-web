# @improbable-eng/grpc-web-arraybufferxhr-transport
ArrayBufferXHR Transport for use with [@improbable-eng/grpc-web](https://github.com/improbable-eng/grpc-web)

## Usage
When making a gRPC request, specify this transport:

```typescript
import { grpc } from '@improbable-eng/grpc-web';
import { ArrayBufferXhrTransport } from '@improbable-eng/grpc-web-arraybufferxhr-transport';

grpc.invoke(MyService.DoQuery, {
  host: "https://example.com",
  transport: ArrayBufferXhrTransport(),
  /* ... */
})
```

Alternatively specify the Default Transport when your server/application bootstraps:
```typescript
import { grpc } from '@improbable-eng/grpc-web';
import { ArrayBufferXhrTransport } from '@improbable-eng/grpc-web-arraybufferxhr-transport';

// Do this first, before you make any grpc requests!
grpc.setDefaultTransport(ArrayBufferXhrTransport());
```
