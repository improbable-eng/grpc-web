import {Metadata} from "../../metadata";
import {Transport, TransportFactory, TransportOptions} from "../Transport";
import {debug} from "../../debug";
import detach from "../../detach";
import {detectMozXHRSupport, detectXHROverrideMimeTypeSupport} from "./xhrUtil";

export interface XhrTransportInit {
  withCredentials?: boolean
}

export function XhrTransport(init: XhrTransportInit): TransportFactory {
  return (opts: TransportOptions) => {
    if (detectMozXHRSupport()) {
      return new MozChunkedArrayBufferXHR(opts, init);
    } else if (detectXHROverrideMimeTypeSupport()) {
      return new XHR(opts, init);
    } else {
      throw new Error("This environment's XHR implementation cannot support binary transfer.");
    }
  }
}

export class XHR implements Transport {
  options: TransportOptions;
  init: XhrTransportInit;
  xhr: XMLHttpRequest;
  metadata: Metadata;
  index: 0;

  constructor(transportOptions: TransportOptions, init: XhrTransportInit) {
    this.options = transportOptions;
    this.init = init;
  }

  onProgressEvent() {
    this.options.debug && debug("XHR.onProgressEvent.length: ", this.xhr.response.length);
    const rawText = this.xhr.response.substr(this.index);
    this.index = this.xhr.response.length;
    const asArrayBuffer = stringToArrayBuffer(rawText);
    detach(() => {
      this.options.onChunk(asArrayBuffer);
    });
  }

  onLoadEvent() {
    this.options.debug && debug("XHR.onLoadEvent");
    detach(() => {
      this.options.onEnd();
    });
  }

  onStateChange() {
    this.options.debug && debug("XHR.onStateChange", this.xhr.readyState);
    if (this.xhr.readyState === XMLHttpRequest.HEADERS_RECEIVED) {
      detach(() => {
        this.options.onHeaders(new Metadata(this.xhr.getAllResponseHeaders()), this.xhr.status);
      });
    }
  }

  sendMessage(msgBytes: Uint8Array) {
    this.xhr.send(msgBytes);
  }

  finishSend() {
  }

  start(metadata: Metadata) {
    this.metadata = metadata;

    const xhr = new XMLHttpRequest();
    this.xhr = xhr;
    xhr.open("POST", this.options.url);

    this.configureXhr();

    this.metadata.forEach((key, values) => {
      xhr.setRequestHeader(key, values.join(", "));
    });

    xhr.withCredentials = Boolean(this.init.withCredentials);

    xhr.addEventListener("readystatechange", this.onStateChange.bind(this));
    xhr.addEventListener("progress", this.onProgressEvent.bind(this));
    xhr.addEventListener("loadend", this.onLoadEvent.bind(this));
    xhr.addEventListener("error", (err: ErrorEvent) => {
      this.options.debug && debug("XHR.error", err);
      detach(() => {
        this.options.onEnd(err.error);
      });
    });
  }

  protected configureXhr(): void {
    this.xhr.responseType = "text";

    // overriding the mime type causes a response that has a code point per byte, which can be decoded using the
    // stringToArrayBuffer function.
    this.xhr.overrideMimeType("text/plain; charset=x-user-defined");
  }

  cancel() {
    this.options.debug && debug("XHR.abort");
    this.xhr.abort();
  }
}

export class MozChunkedArrayBufferXHR extends XHR {
  protected configureXhr(): void {
    this.options.debug && debug("MozXHR.configureXhr: setting responseType to 'moz-chunked-arraybuffer'");
    (this.xhr as any).responseType = "moz-chunked-arraybuffer";
  }

  onProgressEvent() {
    const resp = this.xhr.response;
    this.options.debug && debug("MozXHR.onProgressEvent: ", new Uint8Array(resp));
    detach(() => {
      this.options.onChunk(new Uint8Array(resp));
    });
  }
}

function codePointAtPolyfill(str: string, index: number) {
  let code = str.charCodeAt(index);
  if (code >= 0xd800 && code <= 0xdbff) {
    const surr = str.charCodeAt(index + 1);
    if (surr >= 0xdc00 && surr <= 0xdfff) {
      code = 0x10000 + ((code - 0xd800) << 10) + (surr - 0xdc00);
    }
  }
  return code;
}

export function stringToArrayBuffer(str: string): Uint8Array {
  const asArray = new Uint8Array(str.length);
  let arrayIndex = 0;
  for (let i = 0; i < str.length; i++) {
    const codePoint = (String.prototype as any).codePointAt ? (str as any).codePointAt(i) : codePointAtPolyfill(str, i);
    asArray[arrayIndex++] = codePoint & 0xFF;
  }
  return asArray;
}

