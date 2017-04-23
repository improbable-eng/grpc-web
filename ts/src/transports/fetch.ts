import {BrowserHeaders} from "browser-headers";
import {TransportOptions} from "./Transport";
import {debug} from "../debug";

export default function fetchRequest(options: TransportOptions) {
  options.debug && debug("fetchRequest", options);
  function pump(reader: ReadableStreamReader, res: Response): Promise<Response> {
    return reader.read()
      .then((result: { done: boolean, value: Uint8Array}) => {
        if (result.done) {
          setTimeout(() => {
            options.onComplete();
          });
          return;
        }
        setTimeout(() => {
          options.onChunk(result.value);
        });
        return pump(reader, res);
      });
  }

  fetch(options.url, {
    headers: options.headers.toHeaders(),
    method: "POST",
    body: options.body,
    credentials: options.credentials || undefined,
  }).then((res: Response) => {
    options.debug && debug("fetchRequest.response", res);
    setTimeout(() => {
      options.onHeaders(new BrowserHeaders(res.headers as any), res.status);
    });
    if (res.body) {
      return pump(res.body.getReader(), res)
    }
    return res;
  }).catch(err => {
    options.debug && debug("fetchRequest.catch", err.message);
    setTimeout(() => {
      options.onComplete(err);
    });
  });
}
