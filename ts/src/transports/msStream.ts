import {BrowserHeaders} from "browser-headers";
import {TransportOptions} from "./Transport";
import {debug} from "../debug";

/* ms-stream is required for binary requests in IE 10. This is due to lack of overrideMimeType that enables the text
 * decoding used by the XHR transport. ms-stream has a 16MB response limitation due to fixed buffer length allocation. */
export default function msStreamRequest(options: TransportOptions) {
  options.debug && debug("msStream", options);
  const xhr = new XMLHttpRequest();

  function onLoadEvent() {
    options.debug && debug("msStream.onLoadEvent");
    options.debug && debug("response ", JSON.stringify((xhr as any).response, null, 2));
  }

  function onStateChange() {
    options.debug && debug("msStream.onStateChange", this.readyState);
    if (this.readyState === this.HEADERS_RECEIVED) {
      options.onHeaders(new BrowserHeaders(this.getAllResponseHeaders()), this.status);
    }

    if (this.readyState === this.LOADING) {
      const reader = new MSStreamReader();
      let pos = 0;
      reader.onprogress = function () {
        if (reader.result.byteLength > pos) {
          const asBuffer = new Uint8Array(reader.result, pos);
          pos = reader.result.byteLength;
          options.onChunk(asBuffer);
        }
      };
      reader.onload = function () {
        options.onEnd();
      };
      reader.readAsArrayBuffer(this.response);
    }
  }

  xhr.open("POST", options.url);
  xhr.responseType = "ms-stream";
  options.headers.forEach((key, values) => {
    xhr.setRequestHeader(key, values.join(", "));
  });
  xhr.addEventListener("readystatechange", onStateChange);
  xhr.addEventListener("loadend", onLoadEvent);
  xhr.addEventListener("error", (err: ErrorEvent) => {
    options.debug && debug("msStream.error", err);
    options.onEnd(err.error);
  });
  xhr.send(options.body);
}
