module.exports = {
  swd_ie10: {
    base: 'CustomWebDriver',
    capabilities: {
      browserName: 'ie',
      browserVersion: "10",
      os: 'Windows',
      os_version: "7"
    }
  },
  swd_ie11: {
    base: 'CustomWebDriver',
    capabilities: {
      browserName: 'ie',
      browserVersion: "11",
      os: 'Windows',
      os_version: "7"
    }
  },
  swd_edge14: {
    base: 'CustomWebDriver',
    capabilities: {
      browserName: 'edge',
      browserVersion: "14",
      os: 'Windows',
      os_version: "10"
    }
  },
  swd_edge13: {
    base: 'CustomWebDriver',
    capabilities: {
      browserName: 'edge',
      browserVersion: "13",
      os: 'Windows',
      os_version: "10"
    }
  },
  swd_ff52_win: {
    base: 'CustomWebDriver',
    capabilities: {
      browserName: 'firefox',
      browserVersion: "52",
      os: 'Windows',
      os_version: "10"
    }
  },
  swd_ff52_osx: {
    base: 'CustomWebDriver',
    capabilities: {
      browserName: 'firefox',
      browserVersion: "52",
      os: 'OS X',
      os_version: "Sierra"
    }
  },
  swd_chrome_41: {
    base: 'CustomWebDriver',
    capabilities: {
      browserName: 'chrome',
      browserVersion: "41", // Fetch support added in Chrome 42
      os: 'Windows',
      os_version: "7"
    }
  },
  swd_chrome_57: {
    base: 'CustomWebDriver',
    capabilities: {
      browserName: 'chrome',
      browserVersion: "57",
      os: 'Windows',
      os_version: "7"
    }
  },
  swd_ff38_win: {
    base: 'CustomWebDriver',
    capabilities: {
      browserName: 'firefox',
      browserVersion: "38", // Fetch support added in Firefox 39
      os: 'Windows',
      os_version: "10"
    }
  },
  swd_safari8: {
    base: 'CustomWebDriver',
    capabilities: {
      browserName: 'safari',
      browserVersion: "8",
      os: 'OS X',
      os_version: "Yosemite"
    }
  },
  swd_safari9_1: {
    base: 'CustomWebDriver',
    capabilities: {
      browserName: 'safari',
      browserVersion: "9.1",
      os: 'OS X',
      os_version: "El Capitan"
    }
  },
  // Safari 10 disabled whilst investigating an issue with https requests for unresolved host hanging through Browserstack
  // swd_safari10: {
  //   base: 'CustomWebDriver',
  //   capabilities: {
  //     browserName: 'safari',
  //     browserVersion: "10",
  //     os: 'OS X',
  //     os_version: "Sierra"
  //   }
  // },
};
