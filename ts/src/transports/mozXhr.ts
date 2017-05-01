import {BrowserHeaders} from "browser-headers";
import {TransportOptions} from "./Transport";
import {debug} from "../debug";

/* mozXhrRequest uses XmlHttpRequest with responseType "moz-chunked-arraybuffer" to support binary streaming in Firefox.
 * Firefox's Fetch as of version 52 does not implement a ReadableStream interface. moz-chunked-arraybuffer enables
 * receiving byte chunks without buffering the entire response as the xhrRequest transport does. */
export default function mozXhrRequest(options: TransportOptions) {
  options.debug && debug("mozXhrRequest", options);
  const xhr = new XMLHttpRequest();

  function onProgressEvent() {
    options.debug && debug("mozXhrRequest.onProgressEvent.length: ", xhr.response.length);
    options.onChunk(new Uint8Array(xhr.response));
  }

  function onLoadEvent() {
    options.debug && debug("mozXhrRequest.onLoadEvent");
    options.onEnd();
  }

  function onStateChange() {
    options.debug && debug("mozXhrRequest.onStateChange", this.readyState);
    if (this.readyState === this.HEADERS_RECEIVED) {
      options.onHeaders(new BrowserHeaders(this.getAllResponseHeaders()), this.status);
    }
  }

  xhr.open("POST", options.url);
  (xhr as any).responseType = "moz-chunked-arraybuffer";
  options.headers.forEach((key, values) => {
    xhr.setRequestHeader(key, values.join(", "));
  });
  xhr.addEventListener("readystatechange", onStateChange);
  xhr.addEventListener("progress", onProgressEvent);
  xhr.addEventListener("loadend", onLoadEvent);
  xhr.addEventListener("error", (err: ErrorEvent) => {
    options.debug && debug("mozXhrRequest.error", err);
    options.onEnd(err.error);
  });
  xhr.send(options.body);
}
