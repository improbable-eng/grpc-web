import {
  testHost,
  corsHost
} from "../../hosts-config";
import {grpc} from "../../../ts/src/index";

type TestConfig = {
  testHostUrl: string,
  corsHostUrl: string,
  unavailableHost: string,
  emptyHost: string,
  httpVersion: string,
}

export enum SuiteEnum {
  client,
  invoke,
  unary,
  ChunkParser,
  cancellation,
  detach,
}

type enumMap = {[key: string]: number} & {[key: number]: string};
const suiteNamesMap: enumMap = SuiteEnum as any;

const specifiedSuiteName = process.env.TEST_SUITE_NAME;
export function conditionallyRunTestSuite(suite: SuiteEnum, suiteFunction: () => void) {
  if (suiteNamesMap[suite] === undefined) {
    throw new Error(`Unrecognised suite name: ${suite}`);
  }
  const suiteName = suiteNamesMap[suite];
  if (specifiedSuiteName) {
    if (suiteName === specifiedSuiteName) {
      describe(suiteName, suiteFunction);
    } else {
      console.log(`Skipping "${suiteName}" suite as it is not the specified suite (process.env.TEST_SUITE_NAME is "${specifiedSuiteName}")`)
    }
    return;
  }
  describe(suiteName, suiteFunction);
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

export function runWithSupportedTransports(cb: (transport: grpc.TransportConstructor | undefined) => void) {
  const transports: {[key: string]: grpc.TransportConstructor | undefined} = {
    "defaultTransport": undefined
  };

  for(let transportName in transports) {
    describe(transportName, () => {
      cb(transports[transportName]);
    })
  }
}
