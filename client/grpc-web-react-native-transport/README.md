# @improbable-eng/grpc-web-react-native-transport
Transport for use with [@improbable-eng/grpc-web](https://github.com/improbable-eng/grpc-web)
that works with React Native.

## Usage
When making a gRPC request, specify this transport:

```typescript
import { grpc } from '@improbable-eng/grpc-web';
import { ReactNativeTransport } from '@improbable-eng/grpc-web-react-native-transport';

grpc.invoke(MyService.DoQuery, {
  host: "https://example.com",
  transport: ReactNativeTransport(),
  /* ... */
})
```

Alternatively specify the Default Transport when your server/application bootstraps:
```typescript
import { grpc } from '@improbable-eng/grpc-web';
import { ReactNativeTransport } from '@improbable-eng/grpc-web-react-native-transport';

// Do this first, before you make any grpc requests!
grpc.setDefaultTransport(ReactNativeTransport());
```
