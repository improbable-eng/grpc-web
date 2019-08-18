import { grpc } from "@improbable-eng/grpc-web";

export function ReactNativeTransport(init: grpc.XhrTransportInit): grpc.TransportFactory {
  return (opts: grpc.TransportOptions) => {
    return new ArrayBufferXHR(opts, init);
  }
}

let awaitingExecution: Array<() => void> | null = null;

function runCallbacks() {
  if (awaitingExecution) {
    const thisCallbackSet = awaitingExecution;
    awaitingExecution = null;
    for (let i = 0; i < thisCallbackSet.length; i++) {
      try {
        thisCallbackSet[i]();
      } catch (e) {
        if (awaitingExecution === null) {
          awaitingExecution = [];
          setTimeout(() => {
            runCallbacks();
          }, 0);
        }
        for (let k = thisCallbackSet.length - 1; k > i; k--) {
          awaitingExecution.unshift(thisCallbackSet[k]);
        }
        throw e;
      }
    }
  }
}

function debug(...args: any[]) {
  if (console.debug) {
    console.debug.apply(null, args);
  } else {
    console.log.apply(null, args);
  }
}

function detach(cb: () => void) {
  if (awaitingExecution !== null) {
    awaitingExecution.push(cb);
    return;
  }
  awaitingExecution = [cb];
  setTimeout(() => {
    runCallbacks();
  }, 0);
}

class XHR implements grpc.Transport {
  options: grpc.TransportOptions;
  init: grpc.XhrTransportInit;
  xhr: XMLHttpRequest;
  metadata: grpc.Metadata;
  index: 0;

  constructor(transportOptions: grpc.TransportOptions, init: grpc.XhrTransportInit) {
    this.options = transportOptions;
    this.init = init;
  }

  onProgressEvent() { }

  onLoadEvent() {
    detach(() => {
      this.options.onEnd();
    });
  }

  onStateChange() {
    if (this.xhr.readyState === XMLHttpRequest.HEADERS_RECEIVED) {
      detach(() => {
        this.options.onHeaders(new grpc.Metadata(
          this.xhr.getAllResponseHeaders()), this.xhr.status);
      });
    }
  }

  sendMessage(msgBytes: Uint8Array) {
    this.xhr.send(msgBytes);
  }

  finishSend() { }

  start(metadata: grpc.Metadata) {
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
      detach(() => {
        this.options.onEnd(err.error);
      });
    });
  }

  protected configureXhr(): void {
    this.xhr.responseType = "text";
    this.xhr.overrideMimeType("text/plain; charset=x-user-defined");
  }

  cancel() {
    this.xhr.abort();
  }
}

class ArrayBufferXHR extends XHR {
  configureXhr(): void {
    this.options.debug && debug("ArrayBufferXHR.configureXhr: setting responseType to 'arraybuffer'");
    (this.xhr as any).responseType = "arraybuffer";
  }

  onLoadEvent(): void {
    const resp = this.xhr.response;
    this.options.debug && debug("ArrayBufferXHR.onLoadEvent: ", new Uint8Array(resp));
    detach(() => {
        this.options.onChunk(new Uint8Array(resp), /* flush */ true);
    });
    detach(() => {
        this.options.onEnd();
    });
  }
}
