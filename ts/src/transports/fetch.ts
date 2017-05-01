import {BrowserHeaders} from "browser-headers";
import {TransportOptions} from "./Transport";
import {debug} from "../debug";

/* fetchRequest uses Fetch (with ReadableStream) to read response chunks without buffering the entire response. */
export default function fetchRequest(options: TransportOptions) {
  options.debug && debug("fetchRequest", options);
  function pump(reader: ReadableStreamReader, res: Response): Promise<Response> {
    return reader.read()
      .then((result: { done: boolean, value: Uint8Array}) => {
        if (result.done) {
          options.onEnd();
          return {};
        }
        options.onChunk(result.value);
        return pump(reader, res);
      });
  }

  fetch(options.url, {
    headers: options.headers.toHeaders(),
    method: "POST",
    body: options.body,
  }).then((res: Response) => {
    options.debug && debug("fetchRequest.response", res);
    options.onHeaders(new BrowserHeaders(res.headers as any), res.status);
    if (res.body) {
      return pump(res.body.getReader(), res)
    }
    return res;
  }).catch(err => {
    options.debug && debug("fetchRequest.catch", err.message);
    options.onEnd(err);
  });
}
