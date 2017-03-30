// Karma configuration

var fs = require("fs");
module.exports = function(config) {
  var customLaunchers = {
    'SL_Safari_Latest': {
      base: 'SauceLabs',
      browserName: 'safari',
      platform: 'OS X 10.11'
    },
    'SL_Safari_8': {
      base: 'SauceLabs',
      browserName: 'safari',
      platform: 'OS X 10.10',
      version: '8',
    },
    'SL_Chrome_Latest': {
      base: 'SauceLabs',
      browserName: 'chrome',
      platform: 'linux'
    },
    'SL_Chrome_48': {
      base: 'SauceLabs',
      browserName: 'chrome',
      platform: 'OS X 10.10',
      version: '48',
    },
    'SL_Firefox_Latest': {
      base: 'SauceLabs',
      browserName: 'firefox',
      platform: 'linux'
    },
    'SL_Opera_12': {
      base: 'SauceLabs',
      browserName: 'opera',
      platform: 'Windows 7',
      version: '12'
    },
    'SL_Edge': {
      base: 'SauceLabs',
      browserName: 'microsoftedge',
      platform: 'Windows 10'
    },
    'SL_IE_10': {
      base: 'SauceLabs',
      browserName: 'internet explorer',
      platform: 'Windows 7',
      version: '10'
    },
    'SL_IE_9': {
      base: 'SauceLabs',
      browserName: 'internet explorer',
      platform: 'Windows 7',
      version: '9'
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
