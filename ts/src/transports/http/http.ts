import {TransportFactory} from "../Transport";
import {detectFetchSupport, FetchReadableStreamTransport, FetchTransportInit} from "./fetch";
import {XhrTransport} from "./xhr";

export interface HttpTransportInit {
  withCredentials?: boolean
}

export function HttpTransport(init: HttpTransportInit): TransportFactory {
  if (detectFetchSupport()) {
    const fetchInit: FetchTransportInit = {
      credentials: init.withCredentials ? "include" : "same-origin"
    };
    return FetchReadableStreamTransport(fetchInit);
  }
  return XhrTransport({ withCredentials: init.withCredentials });
}