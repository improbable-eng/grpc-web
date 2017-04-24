import {BrowserHeaders} from "browser-headers";

const HEADER_SIZE = 5;

const global = Function('return this')();

function isTrailerHeader(headerView: DataView) {
  // This is encoded in the MSB of the grpc header's first byte.
  return (headerView.getUint8(0) & 0x80) === 0x80
}

function parseTrailerData(msgData: Uint8Array): BrowserHeaders {
  return new BrowserHeaders(new global.TextDecoder("utf-8").decode(msgData))
}

function readLengthFromHeader(headerView: DataView) {
  return headerView.getUint32(1, false)
}

function hasEnoughBytes(buffer: Uint8Array, position: number, byteCount: number) {
  return buffer.byteLength - position >= byteCount;
}

export function sliceUint8Array(buffer: Uint8Array, from: number, to?: number) {
  if (buffer.slice) {
    return buffer.slice(from ,to);
  }

  let end = buffer.length;
  if (to !== undefined) {
    end = to;
  }

  const num = end - from;
  const array = new Uint8Array(num);
  let arrayIndex = 0;
  for(let i = from; i < end; i++) {
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
  trailers?: BrowserHeaders,
  data?: Uint8Array,
}

export class ChunkParser{
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

