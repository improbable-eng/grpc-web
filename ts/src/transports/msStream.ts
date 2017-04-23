import {BrowserHeaders} from "browser-headers";
import {TransportOptions} from "./Transport";
import {debug} from "../debug";

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
      setTimeout(() => {
        options.onHeaders(new BrowserHeaders(this.getAllResponseHeaders()), this.status);
      });
    }

    if (this.readyState === this.LOADING) {
      const reader = new MSStreamReader();
      let pos = 0;
      reader.onprogress = function () {
        if (reader.result.byteLength > pos) {
          const asBuffer = new Uint8Array(reader.result, pos);
          pos = reader.result.byteLength;
          setTimeout(() => {
            options.onChunk(asBuffer);
          });
        }
      };
      reader.onload = function () {
        setTimeout(() => {
          options.onComplete();
        });
      };
      reader.readAsArrayBuffer(this.response);
    }
  }

  xhr.open("POST", options.url);
  xhr.responseType = "ms-stream";
  options.headers.forEach((key, values) => {
    xhr.setRequestHeader(key, values.join(", "));
  });
  if (options.credentials === "include") {
    xhr.withCredentials = true;
  }
  xhr.addEventListener("readystatechange", onStateChange);
  xhr.addEventListener("loadend", onLoadEvent);
  xhr.addEventListener("error", (err: ErrorEvent) => {
    options.debug && debug("msStream.error", err);
    setTimeout(() => {
      options.onComplete(err.error);
    });
  });
  xhr.send(options.body);
}
