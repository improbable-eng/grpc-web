import {BrowserHeaders} from "browser-headers";
import {TextDecoder} from "text-encoding";

const HEADER_SIZE = 5;

function isTrailerHeader(headerView: DataView) {
  // This is encoded in the MSB of the grpc header's first byte.
  return (headerView.getUint8(0) & 0x80) === 0x80
}

function parseTrailerData(msgData: Uint8Array): BrowserHeaders {
  return new BrowserHeaders(new TextDecoder("utf-8").decode(msgData))
}

function readLengthFromHeader(headerView: DataView) {
  return headerView.getUint32(1, false)
}

function hasEnoughBytes(buffer: ArrayBuffer, position: number, byteCount: number) {
  return buffer.byteLength - position >= byteCount;
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
  buffer: ArrayBuffer | null = null;
  position: number = 0;

  parse(bytes: Uint8Array, flush?: boolean): Chunk[] {
    if (bytes.length === 0 && flush) {
      return [];
    }

    const chunkData: Chunk[] = [];

    if (this.buffer == null) {
      this.buffer = bytes.buffer;
      this.position = 0;
    } else if (this.position === this.buffer.byteLength) {
      this.buffer = bytes.buffer;
      this.position = 0;
    } else {
      const remaining = this.buffer.byteLength - this.position;
      const newBuf = new Uint8Array(remaining + bytes.buffer.byteLength);
      newBuf.set(new Uint8Array(this.buffer, this.position), 0);
      newBuf.set(new Uint8Array(bytes.buffer), remaining);
      this.buffer = newBuf.buffer;
      this.position = 0;
    }

    while (true) {
      if (!hasEnoughBytes(this.buffer, this.position, HEADER_SIZE)) {
        return chunkData;
      }

      let headerBuffer = this.buffer.slice(this.position, this.position + HEADER_SIZE);
      const headerView = new DataView(headerBuffer);
      const msgLength = readLengthFromHeader(headerView);
      if (!hasEnoughBytes(this.buffer, this.position, HEADER_SIZE + msgLength)) {
        return chunkData;
      }

      const messageData = new Uint8Array(this.buffer, this.position + HEADER_SIZE, msgLength);
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

