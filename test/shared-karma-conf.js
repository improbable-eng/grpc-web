// Shared Karma configuration

var fs = require("fs");
var hostsConfig = require("./hosts-config");

module.exports = function(useHttps, withBrowserStack) {
  function configPreprocessor(args, config, logger, helper) {
    return function(content, file, done) {
      var envContent = 'window.USE_HTTPS = ' + useHttps + ';\n';
      envContent += 'window.DEBUG = ' + (process.env.DEBUG !== undefined) + ';\n';
      done(envContent + content);
    };
  }

  var reporters = ['dots'];

  return {
    basePath: '',
    frameworks: ['jasmine'],
    browserStack: {
      forcelocal: true
    },
    files: [
      'ts/build/integration-tests.js'
    ],
    preprocessors: {
      '**/*.js': ['sourcemap', 'config-inject']
    },
    reporters: reporters,
    port: useHttps ? 9876 : 5432,
    protocol: useHttps ? "https" : "http",
    hostname: hostsConfig.testHost,
    httpsServerOptions: {
      key: fs.readFileSync('../misc/localhost.key', 'utf8'),
      cert: fs.readFileSync('../misc/localhost.crt', 'utf8')
    },
    colors: true,
    logLevel: 'INFO',
    client: {
      captureConsole: true,
      runInParent: true,
      useIframe: false
    },
    plugins: [
      require('./custom-karma-driver'),
      {'preprocessor:config-inject': ['factory', configPreprocessor]},
      "karma-sourcemap-loader",
      "karma-jasmine"
    ],
    autoWatch: true,
    captureTimeout: 120000,
    singlerun: withBrowserStack,
    concurrency: withBrowserStack ? 2 : Math.Infinity
  };
};
