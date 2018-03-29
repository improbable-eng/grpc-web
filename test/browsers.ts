const suites = [
  "client",
  "invoke",
  "unary",
  "ChunkParser",
  "cancellation",
  "detach",
];

function browser(browserName, browserVersion, os, osVersion) {
  const browsers = [];
  if (process.env.SEPARATE_TEST_SUITES) {
    suites.forEach(suiteName => {
      browsers.push({
        configName: `${os}_${osVersion}_${browserName}_${browserVersion}_${suiteName}`,
        base: 'CustomWebDriver',
        capabilities: {
          testSuite: suiteName,
          browserName: browserName,
          browserVersion: browserVersion,
          os: os,
          os_version: osVersion
        }
      });
    });
  } else {
    browsers.push({
      configName: `${os}_${osVersion}_${browserName}_${browserVersion}_allsuites`,
      base: 'CustomWebDriver',
      capabilities: {
        testSuite: undefined,
        browserName: browserName,
        browserVersion: browserVersion,
        os: os,
        os_version: osVersion
      }
    })
  }
  return browsers;
}

// Browser versions that should not have any Fetch/XHR differences in functionality to other (tested) versions are
// commented out.
const browsers = {
  edge14_win: browser("edge", "14", "Windows", "10"),
  edge13_win: browser('edge', "13", 'Windows', "10"),
  ie11_win: browser('ie', "11", 'Windows', "7"),
  firefox53_osx: browser('firefox', "53", 'OS X', "Sierra"),
  firefox39_osx: browser('firefox', "39", 'OS X', "Sierra"), // Basic fetch added in 39
  firefox38_osx: browser('firefox', "38", 'OS X', "Sierra"),
  firefox21_osx: browser('firefox', "21", 'OS X', "Sierra"),
  chrome_57: browser('chrome', "57", 'Windows', "7"),
  chrome_52: browser('chrome', "52", 'Windows', "7"),
  chrome_43: browser('chrome', "43", 'Windows', "7"), // Readable stream fetch support added in 43
  chrome_42: browser('chrome', "42", 'Windows', "7"), // Basic fetch added in 42
  chrome_41: browser('chrome', "41", 'Windows', "7"),
  safari11: browser("safari", "11", "OS X", "High Sierra"),
  // // Safari 10 disabled whilst investigating an issue with https requests for unresolved host hanging through Browserstack
  // safari10: browser("safari", "10", "OS X", "Sierra"),
  safari9_1: browser("safari", "9.1", "OS X", "El Capitan"),
  safari8: browser("safari", "8", "OS X", "Yosemite"),
  safari6: browser("safari", "6.2", "OS X", "Mountain Lion")
};

export default () => {
  const browserEnv = process.env.BROWSER;

  const toReturn = {};
  if (browserEnv) {
    const foundBrowser = browsers[browserEnv];
    if (!foundBrowser) {
      throw new Error(`BROWSER env var set to "${browserEnv}", but there is no browser with that identifier`);
    }
    foundBrowser.forEach(browserConfig => {
      toReturn[browserConfig.configName] = browserConfig;
    });
    console.log("toReturn", toReturn);
    return toReturn;
  }

  for(let i in browsers) {
    browsers[i].forEach(browserConfig => {
      toReturn[browserConfig.configName] = browserConfig;
    });
  }
  return toReturn
};
