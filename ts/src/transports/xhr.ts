import {BrowserHeaders} from "browser-headers";
import {TransportOptions} from "./Transport";
import {debug} from "../debug";

/* xhrRequest uses XmlHttpRequest with overrideMimeType combined with a byte decoding method that decodes the UTF-8
 * text response to bytes. */
export default function xhrRequest(options: TransportOptions) {
  options.debug && debug("xhrRequest", options);
  const xhr = new XMLHttpRequest();
  let index = 0;

  function onProgressEvent() {
    options.debug && debug("xhrRequest.onProgressEvent.length: ", xhr.response.length);
    const rawText = xhr.response.substr(index);
    index = xhr.response.length;
    const asArrayBuffer = stringToArrayBuffer(rawText);
    options.onChunk(asArrayBuffer);
  }

  function onLoadEvent() {
    options.debug && debug("xhrRequest.onLoadEvent");
    options.onEnd();
  }

  function onStateChange() {
    options.debug && debug("xhrRequest.onStateChange", this.readyState);
    if (this.readyState === this.HEADERS_RECEIVED) {
      options.onHeaders(new BrowserHeaders(this.getAllResponseHeaders()), this.status);
    }
  }

  xhr.open("POST", options.url);
  (xhr as any).responseType = "text";

  // overriding the mime type causes a response that has a code point per byte, which can be decoded using the
  // stringToArrayBuffer function.
  xhr.overrideMimeType("text/plain; charset=x-user-defined");
  options.headers.forEach((key, values) => {
    xhr.setRequestHeader(key, values.join(", "));
  });
  xhr.addEventListener("readystatechange", onStateChange);
  xhr.addEventListener("progress", onProgressEvent);
  xhr.addEventListener("loadend", onLoadEvent);
  xhr.addEventListener("error", (err: ErrorEvent) => {
    options.debug && debug("xhrRequest.error", err);
    options.onEnd(err.error);
  });
  xhr.send(options.body);
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
