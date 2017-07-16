import {Metadata} from "../grpc";
import fetchRequest from "./fetch";
import xhrRequest from "./xhr";
import mozXhrRequest from "./mozXhr";
import httpNodeTransport from "./nodeHttp";

declare const Response: any;
declare const Headers: any;

export {
  fetchRequest,
  mozXhrRequest,
  xhrRequest
}

export interface Transport {
  (options: TransportOptions): void;
}

export type TransportOptions = {
  debug: boolean,
  url: string,
  headers: Metadata,
  body: ArrayBufferView,
  onHeaders: (headers: Metadata, status: number) => void,
  onChunk: (chunkBytes: Uint8Array, flush?: boolean) => void,
  onEnd: (err?: Error) => void,
}

let xhr: XMLHttpRequest;
function getXHR () {
  if (xhr !== undefined) return xhr;

  if (XMLHttpRequest) {
    xhr = new XMLHttpRequest();
    try {
      xhr.open('GET', 'https://localhost')
    } catch(e) {}
  }
  return xhr
}

function xhrSupportsResponseType(type: string) {
  const xhr = getXHR();
  if (!xhr) {
    return false;
  }
  try {
    (xhr as any).responseType = type;
    return xhr.responseType === type;
  } catch (e) {}
  return false
}

export class DefaultTransportFactory {
  static selected: Transport;
  static getTransport(): Transport {
    if (!this.selected) {
      this.selected = DefaultTransportFactory.detectTransport();
    }
    return this.selected;
  }

  static detectTransport() {
    if (typeof Response !== "undefined" && Response.prototype.hasOwnProperty("body") && typeof Headers === "function") {
      return fetchRequest;
    }

    if (typeof XMLHttpRequest !== "undefined") {
      if (xhrSupportsResponseType("moz-chunked-arraybuffer")) {
        return mozXhrRequest;
      }

      if (XMLHttpRequest.prototype.hasOwnProperty("overrideMimeType")) {
        return xhrRequest;
      }
    }

    if (typeof module !== "undefined" && module.exports) {
      return httpNodeTransport;
    }

    throw new Error("No suitable transport found for gRPC-Web");
  }
}