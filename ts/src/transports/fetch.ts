import {Metadata} from "../metadata";
import {Transport, TransportOptions} from "./Transport";
import {debug} from "../debug";
import detach from "../detach";

/* fetchRequest uses Fetch (with ReadableStream) to read response chunks without buffering the entire response. */
export default function fetchRequest(options: TransportOptions): Transport {
  options.debug && debug("fetchRequest", options);
  return new Fetch(options);
}

declare const Response: any;
declare const Headers: any;

class Fetch implements Transport {
  cancelled: boolean = false;
  options: TransportOptions;
  reader: ReadableStreamReader;
  metadata: Metadata;

  constructor(transportOptions: TransportOptions) {
    this.options = transportOptions;
  }

  pump(readerArg: ReadableStreamReader, res: Response): Promise<void | Response> {
    this.reader = readerArg;
    if (this.cancelled) {
      // If the request was cancelled before the first pump then cancel it here
      this.options.debug && debug("Fetch.pump.cancel at first pump");
      return this.reader.cancel();
    }
    return this.reader.read()
      .then((result: { done: boolean, value: Uint8Array }) => {
        if (result.done) {
          detach(() => {
            this.options.onEnd();
          });
          return res;
        }
        detach(() => {
          this.options.onChunk(result.value);
        });
        return this.pump(this.reader, res);
      });
  }

  send(msgBytes: ArrayBufferView) {
    fetch(this.options.url, {
      headers: this.metadata.toHeaders(),
      method: "POST",
      body: msgBytes,
      credentials: "same-origin",
    }).then((res: Response) => {
      this.options.debug && debug("Fetch.response", res);
      detach(() => {
        this.options.onHeaders(new Metadata(res.headers as any), res.status);
      });
      if (res.body) {
        return this.pump(res.body.getReader(), res)
      }
      return res;
    }).catch(err => {
      if (this.cancelled) {
        this.options.debug && debug("Fetch.catch - request cancelled");
        return;
      }
      this.options.debug && debug("Fetch.catch", err.message);
      detach(() => {
        this.options.onEnd(err);
      });
    });
  }

  sendMessage(msgBytes: ArrayBufferView) {
    this.send(msgBytes);
  }

  finishSend() {

  }

  start(metadata: Metadata) {
    this.metadata = metadata;
  }

  cancel() {
    this.cancelled = true;
    if (this.reader) {
      // If the reader has already been received in the pump then it can be cancelled immediately
      this.options.debug && debug("Fetch.abort.cancel");
      this.reader.cancel();
    } else {
      this.options.debug && debug("Fetch.abort.cancel before reader");
    }
  }
}

export function detectFetchSupport(): boolean {
  return typeof Response !== "undefined" && Response.prototype.hasOwnProperty("body") && typeof Headers === "function";
}