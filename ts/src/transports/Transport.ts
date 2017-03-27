import {BrowserHeaders} from "browser-headers";
import fetchRequest from "./fetch";
import xhrRequest from "./xhr";

declare const Response: any;
declare const Headers: any;

export interface Transport {
  (options: TransportOptions): void;
}

export type TransportOptions = {
  url: string,
  headers: BrowserHeaders,
  credentials: string,
  body: ArrayBuffer,
  onHeaders: (headers: BrowserHeaders, status: number) => void,
  onChunk: (chunkBytes: Uint8Array, flush?: boolean) => void,
  onComplete: (err?: Error) => void,
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

    return xhrRequest;
  }
}