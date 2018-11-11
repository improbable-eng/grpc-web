export interface ProtobufMessageClass<T extends ProtobufMessage> {
  new(): T;
  deserializeBinary(bytes: Uint8Array): T;
}

export interface ProtobufMessage {
  toObject(): {};
  serializeBinary(): Uint8Array;
}
