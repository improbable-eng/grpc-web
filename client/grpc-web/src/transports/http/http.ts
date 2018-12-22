import {TransportFactory} from "../Transport";
import {detectFetchSupport, FetchReadableStreamTransport, FetchTransportInit} from "./fetch";
import {XhrTransport} from "./xhr";

export interface CrossBrowserHttpTransportInit {
  withCredentials?: boolean
}

export function CrossBrowserHttpTransport(init: CrossBrowserHttpTransportInit): TransportFactory {
  if (detectFetchSupport()) {
    const fetchInit: FetchTransportInit = {
      credentials: init.withCredentials ? "include" : "same-origin"
    };
    return FetchReadableStreamTransport(fetchInit);
  }
  return XhrTransport({ withCredentials: init.withCredentials });
}
