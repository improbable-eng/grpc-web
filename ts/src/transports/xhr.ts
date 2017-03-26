import {BrowserHeaders} from "browser-headers";
import {TransportOptions} from "./Transport";

function stringToBuffer(str: string): Uint8Array {
  const asArray = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    asArray[i] = (str as any).codePointAt(i) & 0xFF;
  }
  return asArray;
}

export default function xhrRequest(options: TransportOptions) {
  const xhr = new XMLHttpRequest();
  let index = 0;

  function onProgressEvent() {
    const rawText = xhr.response.substr(index);
    index = xhr.response.length;
    setTimeout(() => {
      options.onChunk(stringToBuffer(rawText));
    });

  }

  function onLoadEvent() {
    setTimeout(() => {
      options.onComplete();
    });
  }

  function onStateChange() {
    if (this.readyState === this.HEADERS_RECEIVED) {
      setTimeout(() => {
        options.onHeaders(new BrowserHeaders(this.getAllResponseHeaders()), this.status);
      });
    }
  }

  xhr.open("POST", options.url);
  xhr.responseType = "text";
  xhr.overrideMimeType("text/plain; charset=x-user-defined");
  options.headers.forEach((key, values) => {
    xhr.setRequestHeader(key, values.join(", "));
  });
  if (options.credentials === "include") {
    xhr.withCredentials = true;
  }
  xhr.addEventListener("readystatechange", onStateChange);
  xhr.addEventListener("progress", onProgressEvent);
  xhr.addEventListener("loadend", onLoadEvent);
  xhr.addEventListener("error", (err: ErrorEvent) => {
    setTimeout(() => {
      options.onComplete(err.error);
    });
  });
  xhr.send(options.body);
}
