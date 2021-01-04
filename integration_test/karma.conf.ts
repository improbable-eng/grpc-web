import * as fs from 'fs';
import customLaunchersGenerator from './browsers';
import customKarmaDriver from './custom-karma-driver';
import {testHost} from './hosts-config';

const junitReportDirectory = process.env.JUNIT_REPORT_PATH || './test-results';

export default (config) => {
  const customLaunchers = customLaunchersGenerator();
  const DEBUG = process.env.DEBUG !== undefined;
  const DISABLE_WEBSOCKET_TESTS = process.env.DISABLE_WEBSOCKET_TESTS !== undefined;
  const useSauceLabs = process.env.SAUCELABS_USERNAME !== undefined;
  const browsers = useSauceLabs ? Object.keys(customLaunchers) : [];

  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    jasmine: {
      random: false,
    },
    files: [
      'ts/build/integration-tests.js'
    ],
    preprocessors: {
      '**/*.js': ['sourcemap', 'config-inject']
    },
    reporters: ['mocha', 'junit'],
    junitReporter: {
      outputDir: junitReportDirectory,
    },
    protocol: 'https',
    hostname: testHost,
    port: 9876,
    httpsServerOptions: {
      key: fs.readFileSync('../misc/localhost.key', 'utf8'),
      cert: fs.readFileSync('../misc/localhost.crt', 'utf8')
    },
    colors: true,
    logLevel: DEBUG ? 'DEBUG' : 'INFO',
    client: {
      captureConsole: true,
      runInParent: false,
      useIframe: true,
    },
    plugins: [
      customKarmaDriver,
      {'preprocessor:config-inject': [
          'factory', () =>
            (content, file, done) =>
              done(`window.DEBUG = ${DEBUG};window.DISABLE_WEBSOCKET_TESTS = ${DISABLE_WEBSOCKET_TESTS};\n${content}`)
        ]},
      'karma-sourcemap-loader',
      'karma-mocha-reporter',
      'karma-junit-reporter',
      'karma-jasmine'
    ],
    transports: ['polling'],
    autoWatch: true,
    disconnectTolerance: 5,
    captureTimeout: 300000,
    browserDisconnectTimeout: 300000,
    browserNoActivityTimeout: 300000,
    singlerun: useSauceLabs,
    concurrency: 4,
    customLaunchers: customLaunchers,
    browsers: browsers
  });
};
