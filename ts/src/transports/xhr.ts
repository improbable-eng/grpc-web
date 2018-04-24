import {Metadata} from "../metadata";
import {Transport, TransportOptions} from "./Transport";
import {debug} from "../debug";
import detach from "../detach";

/* xhrRequest uses XmlHttpRequest with overrideMimeType combined with a byte decoding method that decodes the UTF-8
 * text response to bytes. */
export default function xhrRequest(options: TransportOptions): Transport {
  options.debug && debug("xhrRequest", options);

  return new XHR(options);
}

class XHR implements Transport {
  options: TransportOptions;
  xhr: XMLHttpRequest;
  metadata: Metadata;
  index: 0;

  constructor(transportOptions: TransportOptions) {
    this.options = transportOptions;
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
    (xhr as any).responseType = "text";

    // overriding the mime type causes a response that has a code point per byte, which can be decoded using the
    // stringToArrayBuffer function.
    xhr.overrideMimeType("text/plain; charset=x-user-defined");
    this.metadata.forEach((key, values) => {
      xhr.setRequestHeader(key, values.join(", "));
    });
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

  cancel() {
    this.options.debug && debug("XHR.abort");
    this.xhr.abort();
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

export function detectXHRSupport(): boolean {
  return typeof XMLHttpRequest !== "undefined" && XMLHttpRequest.prototype.hasOwnProperty("overrideMimeType")
}