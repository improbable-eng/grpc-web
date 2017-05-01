function browser(browserName, browserVersion, os, osVersion) {
  return {
    base: 'CustomWebDriver',
    capabilities: {
      browserName: browserName,
      browserVersion: browserVersion,
      os: os,
      os_version: osVersion
    }
  };
}

// Browser versions that should not have any Fetch/XHR differences in functionality to other (tested) versions are
// commented out.

module.exports = {
  edge14_win: browser("edge", "14", "Windows", "10"),
  edge13_win: browser('edge', "13", 'Windows', "10"),
  ie11_win: browser('ie',  "11", 'Windows', "7"),
  ie10_win: browser('ie',  "10", 'Windows', "7"),
  firefox53_osx: browser('firefox', "53", 'OS X', "Sierra"),
  // firefox52_osx: browser('firefox', "52", 'OS X', "Sierra"),
  // firefox51_osx: browser('firefox', "51", 'OS X', "Sierra"),
  // firefox50_osx: browser('firefox', "50", 'OS X', "Sierra"),
  // firefox49_osx: browser('firefox', "49", 'OS X', "Sierra"),
  // firefox48_osx: browser('firefox', "48", 'OS X', "Sierra"),
  // firefox47_osx: browser('firefox', "47", 'OS X', "Sierra"),
  // firefox46_osx: browser('firefox', "46", 'OS X', "Sierra"),
  // firefox45_osx: browser('firefox', "45", 'OS X', "Sierra"),
  // firefox44_osx: browser('firefox', "44", 'OS X', "Sierra"),
  // firefox43_osx: browser('firefox', "43", 'OS X', "Sierra"),
  // firefox42_osx: browser('firefox', "42", 'OS X', "Sierra"),
  // firefox41_osx: browser('firefox', "41", 'OS X', "Sierra"),
  // firefox40_osx: browser('firefox', "40", 'OS X', "Sierra"),
  firefox39_osx: browser('firefox', "39", 'OS X', "Sierra"), // Basic fetch added in 39
  firefox38_osx: browser('firefox', "38", 'OS X', "Sierra"),
  chrome_57: browser('chrome', "57", 'Windows', "7"),
  // chrome_56: browser('chrome', "56", 'Windows', "7"),
  // chrome_55: browser('chrome', "55", 'Windows', "7"),
  // chrome_54: browser('chrome', "54", 'Windows', "7"),
  // chrome_53: browser('chrome', "53", 'Windows', "7"),
  chrome_52: browser('chrome', "52", 'Windows', "7"),
  // chrome_51: browser('chrome', "51", 'Windows', "7"),
  // chrome_50: browser('chrome', "50", 'Windows', "7"),
  // chrome_49: browser('chrome', "49", 'Windows', "7"),
  // chrome_48: browser('chrome', "48", 'Windows', "7"),
  // chrome_47: browser('chrome', "47", 'Windows', "7"),
  // chrome_46: browser('chrome', "46", 'Windows', "7"),
  // chrome_45: browser('chrome', "45", 'Windows', "7"),
  // chrome_44: browser('chrome', "44", 'Windows', "7"),
  chrome_43: browser('chrome', "43", 'Windows', "7"), // Readable stream fetch support added in 43
  chrome_42: browser('chrome', "42", 'Windows', "7"), // Basic fetch added in 42
  chrome_41: browser('chrome', "41", 'Windows', "7"),
  // // Safari 10 disabled whilst investigating an issue with https requests for unresolved host hanging through Browserstack
  // safari10: browser("safari", "10", "OS X", "Sierra"),
  safari9_1: browser("safari", "9.1", "OS X", "El Capitan"),
  safari8: browser("safari", "8", "OS X", "Yosemite")
};
