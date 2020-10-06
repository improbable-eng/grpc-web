function browser(browserName, browserVersion, os, options?: {}) {
  const browsers = [];
  browsers.push({
    configName: `${os}_${browserName}_${browserVersion}_allsuites`,
    base: 'CustomWebDriver',
    capabilities: {
      ...(options || {}),
      testSuite: undefined,
      browserName: browserName,
      browserVersion: browserVersion,
      os: os,
    }
  })
  return browsers;
}

// Browser versions that should not have any Fetch/XHR differences in functionality to other (tested) versions are
// commented out.
const browsers = {
  // Firefox
  firefox80_osx: browser('firefox', '80', 'OS X Sierra'),
  firefox39_osx: browser('firefox', '39', 'OS X Sierra'), // Basic fetch added in 39
  firefox38_osx: browser('firefox', '38', 'OS X Sierra'),
  firefox21_osx: browser('firefox', '21', 'OS X Sierra'),

  // Chrome
  chrome_85: browser('chrome', '57', 'Windows 7'),
  chrome_52: browser('chrome', '52', 'Windows 7'),
  chrome_43: browser('chrome', '43', 'Windows 7'), // Readable stream fetch support added in 43
  chrome_42: browser('chrome', '42', 'Windows 7'), // Basic fetch added in 42
  chrome_41: browser('chrome', '41', 'Windows 7'),

  // Edge
  edge85_win: browser('MicrosoftEdge', '85', 'Windows 10'),
  edge16_win: browser('MicrosoftEdge', '16', 'Windows 10', {edgeAcceptSsl: true}),

  // Safari
  safari13_1: browser('safari', '13.1', 'OS X 10.15', {useSslBumping: true}),
  safari12_1: browser('safari', '12.0', 'OS X 10.14',{useSslBumping: true}),
  safari11_1: browser('safari', '11.1', 'OS X 10.13',{useSslBumping: true}),
  safari10_1: browser('safari', '10.1', 'OS X 10.12',{useSslBumping: true}),
  safari9_1: browser('safari', '9.0', 'OS X 10.11',{useSslBumping: true}),
  safari8: browser('safari', '8.0', 'OS X 10.10',{useSslBumping: true}),

  // IE
  ie11_win: browser('ie', '11', 'Windows 7'),
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
