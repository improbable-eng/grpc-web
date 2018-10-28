export enum SuiteEnum {
  client,
  clientWebsockets,
  invoke,
  unary,
  ChunkParser,
  cancellation,
  detach,
}

type enumMap = {[key: string]: number} & {[key: number]: string};
const suiteNamesMap: enumMap = SuiteEnum as any;

let specifiedSuiteName: string | undefined;
if (typeof process.env.TEST_SUITE_NAME !== "undefined") {
  specifiedSuiteName = process.env.TEST_SUITE_NAME;
} else if (typeof window !== "undefined") {
  specifiedSuiteName = window.location.hash.length > 1 ? window.location.hash.substring(1) : undefined;
}
export function conditionallyRunTestSuite(suite: SuiteEnum, suiteFunction: () => void) {
  if (suiteNamesMap[suite] === undefined) {
    throw new Error(`Unrecognised suite name: ${suite}`);
  }
  const suiteName = suiteNamesMap[suite];
  if (specifiedSuiteName) {
    if (suiteName === specifiedSuiteName) {
      describe(suiteName, suiteFunction);
    } else {
      console.log(`Skipping "${suiteName}" suite as it is not the specified suite (specifiedSuiteName is "${specifiedSuiteName}")`)
    }
    return;
  }
  describe(suiteName, suiteFunction);
}
