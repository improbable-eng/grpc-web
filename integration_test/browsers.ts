import {SuiteEnum} from "./ts/suiteUtils";

function browser(browserName, browserVersion, os, osVersion) {
  const browsers = [];
  if (process.env.TEST_SUITE_NAME) {
    browsers.push({
      configName: `${os}_${osVersion}_${browserName}_${browserVersion}_${process.env.TEST_SUITE_NAME}`,
      base: 'CustomWebDriver',
      capabilities: {
        testSuite: process.env.TEST_SUITE_NAME,
        browserName: browserName,
        browserVersion: browserVersion,
        os: os,
        os_version: osVersion
      }
    });
  } else if (process.env.SEPARATE_TEST_SUITES) {
    for (let suiteName in SuiteEnum) {
      if (isNaN(Number(suiteName))) {
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
      }
    }
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
  // Firefox
  firefox80_osx: browser('firefox', "80", 'OS X', "Sierra"),
  firefox39_osx: browser('firefox', "39", 'OS X', "Sierra"), // Basic fetch added in 39
  firefox38_osx: browser('firefox', "38", 'OS X', "Sierra"),
  firefox21_osx: browser('firefox', "21", 'OS X', "Sierra"),

  // Chrome
  chrome_85: browser('chrome', "57", 'Windows', "7"),
  chrome_52: browser('chrome', "52", 'Windows', "7"),
  chrome_43: browser('chrome', "43", 'Windows', "7"), // Readable stream fetch support added in 43
  chrome_42: browser('chrome', "42", 'Windows', "7"), // Basic fetch added in 42
  chrome_41: browser('chrome', "41", 'Windows', "7"),

  // Edge
  edge85_win: browser("edge", "85", "Windows", "10"),
  edge18_win: browser("edge", "18", "Windows", "10"),
  edge17_win: browser("edge", "17", "Windows", "10"),
  edge16_win: browser('edge', "16", 'Windows', "10"),

  // Safari
  safari13_1: browser("safari", "13.1", "OS X", "Catalina"),
  safari12_1: browser("safari", "12.1", "OS X", "Mojave"),
  safari11_1: browser("safari", "11.1", "OS X", "High Sierra"),
  safari10_1: browser("safari", "10.1", "OS X", "Sierra"),
  safari9_1: browser("safari", "9.1", "OS X", "El Capitan"),
  safari8: browser("safari", "8", "OS X", "Yosemite"),

  // IE
  ie11_win: browser('ie', "11", 'Windows', "7"),
};

export default () => {
  const browserEnv = process.env.BROWSER;

  const filteredBrowsers = {};
  if (browserEnv) {
    const foundBrowser = browsers[browserEnv];
    if (!foundBrowser) {
      throw new Error(`BROWSER env var set to "${browserEnv}", but there is no browser with that identifier`);
    }
    foundBrowser.forEach(browserConfig => {
      filteredBrowsers[browserConfig.configName] = browserConfig;
    });
    return filteredBrowsers;
  }

  for(let i in browsers) {
    browsers[i].forEach(browserConfig => {
      filteredBrowsers[browserConfig.configName] = browserConfig;
    });
  }
  return filteredBrowsers
};
