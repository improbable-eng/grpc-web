// Karma configuration

var fs = require("fs");
module.exports = function(config) {
  var customLaunchers = {
    'SL_Chrome_Latest': {
      base: 'SauceLabs',
      browserName: 'chrome',
      platform: 'OS X 10.10'
    },
    'SL_Chrome_48': {
      base: 'SauceLabs',
      browserName: 'chrome',
      platform: 'OS X 10.10',
      version: '48'
    },
    'SL_Chrome_41': { // Fetch support added in Chrome 42
      base: 'SauceLabs',
      browserName: 'chrome',
      platform: 'OS X 10.10',
      version: '41'
    },
    'SL_Firefox_Latest': {
      base: 'SauceLabs',
      browserName: 'firefox',
      platform: 'OS X 10.10'
    },
    'SL_Firefox_52': {
      base: 'SauceLabs',
      browserName: 'firefox',
      platform: 'OS X 10.10',
      version: '52'
    },
    'SL_Firefox_38': { // Fetch support added in Firefox 39
      base: 'SauceLabs',
      browserName: 'firefox',
      platform: 'OS X 10.10',
      version: '38'
    }
  };

  var reporters = ['dots'];
  var browsers = [];
  var singlerun = false;
  var concurrency = Infinity;

  if (process.env.SAUCE_USERNAME) {
    reporters.push('saucelabs');
    Array.prototype.push.apply(browsers, Object.keys(customLaunchers));
    singlerun = true;
    concurrency = 2;
  }

  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    sauceLabs: {
      recordScreenshots: false,
      avoidProxy: true,
      connectOptions: {
        port: 5757,
        logfile: 'sauce_connect.log'
      },
      public: 'public'
    },
    files: [
      'ts/build/integration-tests.js'
    ],
    preprocessors: {
      '**/*.js': ['sourcemap']
    },
    reporters: reporters,
    port: 9876,
    protocol: "https",
    httpsServerOptions: {
      key: fs.readFileSync('../misc/localhost.key', 'utf8'),
      cert: fs.readFileSync('../misc/localhost.crt', 'utf8')
    },
    colors: true,
    client: {
      captureConsole: true,
      runInParent: true,
      useIframe: false,
    },
    autoWatch: true,
    browsers: browsers,
    captureTimeout: 120000,
    customLaunchers: customLaunchers,
    singleRun: singlerun,
    concurrency: concurrency
  })
};
