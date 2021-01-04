import {
  testHost,
  corsHost
} from "../../hosts-config";
import {grpc} from "@improbable-eng/grpc-web";
import {NodeHttpTransport} from "@improbable-eng/grpc-web-node-http-transport";
import { DISABLE_WEBSOCKET_TESTS } from "./util";

type TestConfig = {
  testHostUrl: string,
  corsHostUrl: string,
  unavailableHost: string,
  emptyHost: string,
  httpVersion: string,
}

export function headerTrailerCombos(cb: (withHeaders: boolean, withTrailers: boolean) => void) {
  describe("(no headers - no trailers)", () => {
    cb(false, false);
  });
  describe("(with headers - no trailers)", () => {
    cb(true, false);
  });
  describe("(no headers - with trailers)", () => {
    cb(false, true);
  });
  describe("(with headers - with trailers)", () => {
    cb(true, true);
  });
}

const http1Config: TestConfig = {
  testHostUrl: `https://${testHost}:9100`,
  corsHostUrl: `https://${corsHost}:9100`,
  unavailableHost: `https://${testHost}:9999`,
  emptyHost: `https://${corsHost}:9105`,
  httpVersion: "http1",
};

const http2Config: TestConfig = {
  testHostUrl: `https://${testHost}:9090`,
  corsHostUrl: `https://${corsHost}:9090`,
  unavailableHost: `https://${testHost}:9999`,
  emptyHost: `https://${corsHost}:9095`,
  httpVersion: "http2",
};

export function runWithHttp1AndHttp2(cb: (config: TestConfig) => void) {
  describe("(http1)", () => {
    cb(http1Config);
  });
  describe("(http2)", () => {
    cb(http2Config);
  });
}

export function runWithSupportedTransports(cb: (transport: grpc.TransportFactory | undefined) => void) {
  const transports: {[key: string]: grpc.TransportFactory | undefined} = {
    "httpTransport": undefined
  };

  if (process.env.BROWSER === "nodejs") {
    grpc.setDefaultTransport(NodeHttpTransport());
  }

  if (!DISABLE_WEBSOCKET_TESTS) {
    transports["websocketTransport"] = grpc.WebsocketTransport();
  }

  for (let transportName in transports) {
    describe(transportName, () => {
      cb(transports[transportName]);
    })
  }
}
