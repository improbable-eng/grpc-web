 function browser(browserName, browserVersion, os, options?: {}) {
  return {
    configName: `${os}_${browserName}_${browserVersion}`,
    base: 'CustomWebDriver',
    capabilities: {
      ...(options || {}),
      testSuite: undefined,
      browserName: browserName,
      browserVersion: browserVersion,
      os: os,
    }
  }
}

const browsers = {
  // Firefox
  firefox80_win: browser('firefox', '80', 'Windows 10',{custom: {acceptInsecureCerts: true}}),
  firefox39_win: browser('firefox', '39', 'Windows 10',{custom: {acceptInsecureCerts: true}}), // Basic fetch added in 39
  firefox38_win: browser('firefox', '38', 'Windows 10',{custom: {acceptInsecureCerts: true}}),
  firefox21_win: browser('firefox', '21', 'Windows 10',{custom: {acceptInsecureCerts: true}}),

  // Chrome
  chrome_85: browser('chrome', '85', 'Windows 10', {certOverrideJSElement: 'proceed-link'}),
  chrome_52: browser('chrome', '52', 'Windows 10'),
  chrome_43: browser('chrome', '43', 'Linux'), // Readable stream fetch support added in 43
  chrome_42: browser('chrome', '42', 'Linux'), // Basic fetch added in 42
  chrome_41: browser('chrome', '41', 'Linux'),

  // Edge
  edge85_win: browser('MicrosoftEdge', '85', 'Windows 10', {certOverrideJSElement: 'proceed-link'}),
  edge16_win: browser('MicrosoftEdge', '16', 'Windows 10', {certOverrideJSElement: 'invalidcert_continue'}),
  edge14_win: browser('MicrosoftEdge', '14', 'Windows 10', {certOverrideJSElement: 'invalidcert_continue'}),
  edge13_win: browser('MicrosoftEdge', '13', 'Windows 10', {certOverrideJSElement: 'invalidcert_continue'}),

  // Safari
  safari13_1: browser('safari', '13.1', 'OS X 10.15', {useSslBumping: true, disableWebsocketTests: true}),
  safari12_1: browser('safari', '12.0', 'OS X 10.14',{useSslBumping: true, disableWebsocketTests: true}),
  safari11_1: browser('safari', '11.1', 'OS X 10.13',{useSslBumping: true, disableWebsocketTests: true}),
  safari10_1: browser('safari', '10.1', 'OS X 10.12',{useSslBumping: true, disableWebsocketTests: true}),
  safari9_1: browser('safari', '9.0', 'OS X 10.11',{useSslBumping: true, disableWebsocketTests: true}),
  safari8: browser('safari', '8.0', 'OS X 10.10',{useSslBumping: true, disableWebsocketTests: true}),

  // IE
  ie11_win: browser('internet explorer', '11', 'Windows 10', {certOverrideJSElement: 'overridelink', disableWebsocketTests: true}),
};

export default () => {
  const browserEnv = process.env.BROWSER;

  const filteredBrowsers = {};
  if (browserEnv) {
    const foundBrowser = browsers[browserEnv];
    if (!foundBrowser) {
      throw new Error(`BROWSER env var set to "${browserEnv}", but there is no browser with that identifier`);
    }
    filteredBrowsers[foundBrowser.configName] = foundBrowser;
    return filteredBrowsers;
  }

  for(let i in browsers) {
    const browserConfig = browsers[i]
    filteredBrowsers[browserConfig.configName] = browserConfig;
  }
  return filteredBrowsers
};
