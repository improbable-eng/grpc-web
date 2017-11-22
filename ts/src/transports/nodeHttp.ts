import * as http from 'http';
import * as https from 'https';
import * as url from 'url';
import {CancelFunc, TransportOptions} from "./Transport";
import {Metadata} from "../grpc";

/* nodeHttpRequest uses the node http and https modules */
export default function nodeHttpRequest(options: TransportOptions): CancelFunc {
  options.debug && console.log('httpNodeTransport', options);

  const headers: { [key: string]: string } = {};
  options.headers.forEach((key, values) => {
    headers[key] = values.join(', ');
  });

  const parsedUrl = url.parse(options.url);

  const httpOptions = {
    host: parsedUrl.hostname,
    port: parsedUrl.port ? parseInt(parsedUrl.port) : undefined,
    path: parsedUrl.path,
    headers: headers,
    method: 'POST'
  };

  const responseCallback = (response: http.IncomingMessage) => {
    options.debug && console.log('httpNodeTransport.response', response.statusCode);
    const headers = filterHeadersForUndefined(response.headers);
    options.onHeaders(new Metadata(headers), response.statusCode!);

    response.on('data', chunk => {
      options.debug && console.log('httpNodeTransport.data', chunk);
      options.onChunk(toArrayBuffer(chunk as Buffer));
    });

    response.on('end', () => {
      options.debug && console.log('httpNodeTransport.end');
      options.onEnd();
    });
  };

  let request: http.ClientRequest;
  if (parsedUrl.protocol === "https:") {
    request = https.request(httpOptions, responseCallback);
  } else {
    request = http.request(httpOptions, responseCallback);
  }
  request.on('error', err => {
    options.debug && console.log('httpNodeTransport.error', err);
    options.onEnd(err);
  });
  request.write(toBuffer(options.body));
  request.end();

  return () => {
    options.debug && console.log("httpNodeTransport.abort");
    request.abort();
  }
}

function filterHeadersForUndefined(headers: {[key: string]: string | string[] | undefined}): {[key: string]: string | string[]} {
  const filteredHeaders: {[key: string]: string | string[]} = {};

  for (let key in headers) {
    const value = headers[key];
    if (headers.hasOwnProperty(key)) {
      if (value !== undefined) {
        filteredHeaders[key] = value;
      }
    }
  }

  return filteredHeaders;
}

function toArrayBuffer(buf: Buffer): Uint8Array {
  const view = new Uint8Array(buf.length);
  for (let i = 0; i < buf.length; i++) {
    view[i] = buf[i];
  }
  return view;
}

function toBuffer(ab: ArrayBufferView): Buffer {
  const buf = new Buffer(ab.byteLength);
  const view = new Uint8Array(ab.buffer);
  for (let i = 0; i < buf.length; i++) {
    buf[i] = view[i];
  }
  return buf;
}
