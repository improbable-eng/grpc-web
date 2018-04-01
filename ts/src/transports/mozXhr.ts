import {Metadata} from "../metadata";
import {Transport, TransportOptions} from "./Transport";
import {debug} from "../debug";
import detach from "../detach";
import {xhrSupportsResponseType} from "./xhrUtil";

/* mozXhrRequest uses XmlHttpRequest with responseType "moz-chunked-arraybuffer" to support binary streaming in Firefox.
 * Firefox's Fetch as of version 52 does not implement a ReadableStream interface. moz-chunked-arraybuffer enables
 * receiving byte chunks without buffering the entire response as the xhrRequest transport does. */
export default function mozXhrRequest(options: TransportOptions): Transport {
  options.debug && debug("mozXhrRequest", options);
  return new MozXHR(options);
}

class MozXHR implements Transport {
  options: TransportOptions;
  xhr: XMLHttpRequest;
  metadata: Metadata;
  index: 0;

  constructor(transportOptions: TransportOptions) {
    this.options = transportOptions;
  }

  onProgressEvent() {
    const resp = this.xhr.response;
    this.options.debug && debug("MozXHR.onProgressEvent: ", new Uint8Array(resp));
    detach(() => {
      this.options.onChunk(new Uint8Array(resp));
    });
  }

  onLoadEvent() {
    this.options.debug && debug("MozXHR.onLoadEvent");
    detach(() => {
      this.options.onEnd();
    });
  }

  onStateChange() {
    this.options.debug && debug("MozXHR.onStateChange", this.xhr.readyState);
    this.options.debug && debug("MozXHR.XMLHttpRequest.HEADERS_RECEIVED", XMLHttpRequest.HEADERS_RECEIVED);
    if (this.xhr.readyState === XMLHttpRequest.HEADERS_RECEIVED) {
      detach(() => {
        this.options.onHeaders(new Metadata(this.xhr.getAllResponseHeaders()), this.xhr.status);
      });
    }
  }

  sendMessage(msgBytes: Uint8Array) {
    this.options.debug && debug("MozXHR.sendMessage");
    this.xhr.send(msgBytes);
  }

  finishSend() {

  }

  start(metadata: Metadata) {
    this.options.debug && debug("MozXHR.start");
    this.metadata = metadata;

    const xhr = new XMLHttpRequest();
    this.xhr = xhr;
    xhr.open("POST", this.options.url);
    (xhr as any).responseType = "moz-chunked-arraybuffer";

    this.metadata.forEach((key, values) => {
      xhr.setRequestHeader(key, values.join(", "));
    });
    xhr.addEventListener("readystatechange", this.onStateChange.bind(this));
    xhr.addEventListener("progress", this.onProgressEvent.bind(this));
    xhr.addEventListener("loadend", this.onLoadEvent.bind(this));
    xhr.addEventListener("error", (err: ErrorEvent) => {
      this.options.debug && debug("MozXHR.error", err);
      detach(() => {
        this.options.onEnd(err.error);
      });
    });
  }

  cancel() {
    this.options.debug && debug("MozXHR.cancel");
    this.xhr.abort();
  }
}

export function detectMozXHRSupport(): boolean {
  return typeof XMLHttpRequest !== "undefined" && xhrSupportsResponseType("moz-chunked-arraybuffer")
}