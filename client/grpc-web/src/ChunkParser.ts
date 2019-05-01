import {Metadata} from "./metadata";

const HEADER_SIZE = 5;

const isAllowedControlChars = (char: number) => char === 0x9 || char === 0xa || char === 0xd;

function isValidHeaderAscii(val: number): boolean {
  return isAllowedControlChars(val) || (val >= 0x20 && val <= 0x7e);
}

export function decodeASCII(input: Uint8Array): string {
  // With ES2015, TypedArray.prototype.every can be used
  for (let i = 0; i !== input.length; ++i) {
    if (!isValidHeaderAscii(input[i])) {
      throw new Error("Metadata is not valid (printable) ASCII");
    }
  }
  // With ES2017, the array conversion can be omitted with iterables
  return String.fromCharCode(...Array.prototype.slice.call(input));
}

export function encodeASCII(input: string): Uint8Array {
  const encoded = new Uint8Array(input.length);
  for (let i = 0; i !== input.length; ++i) {
    const charCode = input.charCodeAt(i);
    if (!isValidHeaderAscii(charCode)) {
      throw new Error("Metadata contains invalid ASCII");
    }
    encoded[i] = charCode;
  }
  return encoded;
}

function isTrailerHeader(headerView: DataView) {
  // This is encoded in the MSB of the grpc header's first byte.
  return (headerView.getUint8(0) & 0x80) === 0x80
}

function parseTrailerData(msgData: Uint8Array): Metadata {
  return new Metadata(decodeASCII(msgData))
}

function readLengthFromHeader(headerView: DataView) {
  return headerView.getUint32(1, false)
}

function hasEnoughBytes(buffer: Uint8Array, position: number, byteCount: number) {
  return buffer.byteLength - position >= byteCount;
}

function sliceUint8Array(buffer: Uint8Array, from: number, to?: number) {
  if (buffer.slice) {
    return buffer.slice(from, to);
  }

  let end = buffer.length;
  if (to !== undefined) {
    end = to;
  }

  const num = end - from;
  const array = new Uint8Array(num);
  let arrayIndex = 0;
  for (let i = from; i < end; i++) {
    array[arrayIndex++] = buffer[i];
  }
  return array;
}

export enum ChunkType {
  MESSAGE = 1,
  TRAILERS = 2,
}

export type Chunk = {
  chunkType: ChunkType,
  trailers?: Metadata,
  data?: Uint8Array,
}

export class ChunkParser {
  buffer: Uint8Array | null = null;
  position: number = 0;

  parse(bytes: Uint8Array, flush?: boolean): Chunk[] {
    if (bytes.length === 0 && flush) {
      return [];
    }

    const chunkData: Chunk[] = [];

    if (this.buffer == null) {
      this.buffer = bytes;
      this.position = 0;
    } else if (this.position === this.buffer.byteLength) {
      this.buffer = bytes;
      this.position = 0;
    } else {
      const remaining = this.buffer.byteLength - this.position;
      const newBuf = new Uint8Array(remaining + bytes.byteLength);
      const fromExisting = sliceUint8Array(this.buffer, this.position);
      newBuf.set(fromExisting, 0);
      const latestDataBuf = new Uint8Array(bytes);
      newBuf.set(latestDataBuf, remaining);
      this.buffer = newBuf;
      this.position = 0;
    }

    while (true) {
      if (!hasEnoughBytes(this.buffer, this.position, HEADER_SIZE)) {
        return chunkData;
      }

      let headerBuffer = sliceUint8Array(this.buffer, this.position, this.position + HEADER_SIZE);

      const headerView = new DataView(headerBuffer.buffer, headerBuffer.byteOffset, headerBuffer.byteLength);

      const msgLength = readLengthFromHeader(headerView);
      if (!hasEnoughBytes(this.buffer, this.position, HEADER_SIZE + msgLength)) {
        return chunkData;
      }

      const messageData = sliceUint8Array(this.buffer, this.position + HEADER_SIZE, this.position + HEADER_SIZE + msgLength);
      this.position += HEADER_SIZE + msgLength;

      if (isTrailerHeader(headerView)) {
        chunkData.push({chunkType: ChunkType.TRAILERS, trailers: parseTrailerData(messageData)});
        return chunkData;
      } else {
        chunkData.push({chunkType: ChunkType.MESSAGE, data: messageData})
      }
    }
  }
}

