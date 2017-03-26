import {BrowserHeaders} from "browser-headers";
import {TransportOptions} from "./Transport";

export default function fetchRequest(options: TransportOptions) {
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
    credentials: options.credentials,
  }).then((res: Response) => {
    setTimeout(() => {
      options.onHeaders(new BrowserHeaders(res.headers as any), res.status);
    });
    if (res.body) {
      return pump(res.body.getReader(), res)
    }
    return res;
  }).catch(err => {
    setTimeout(() => {
      options.onComplete(err);
    });
  });
}
