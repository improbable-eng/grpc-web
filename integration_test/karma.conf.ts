import * as fs from 'fs';
import customLaunchersGenerator from './browsers';
import {testHost} from './hosts-config';

export default (config) => {

  const customLaunchers = customLaunchersGenerator();
  const DEBUG = process.env.DEBUG !== undefined;
  const useBrowserStack = process.env.BROWSERSTACK_USERNAME !== undefined;
  const browsers = useBrowserStack ? Object.keys(customLaunchers) : [];

  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    // hostname for local
    hostname: testHost,

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine'],

    //plugins
    plugins: [
      {'preprocessor:config-inject': [
          'factory', () =>
            (content, file, done) =>
              done(`window.DEBUG = ${DEBUG};\n${content}`)
        ]},
      'karma-sourcemap-loader',
      'karma-mocha-reporter',
      'karma-jasmine',
      'karma-browserstack-launcher',
    ],


    files: [
      'ts/build/integration-tests.js'
    ],
    preprocessors: {
      '**/*.js': ['sourcemap', 'config-inject']
    },


    // list of files to exclude
    exclude: [
    ],

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress', 'BrowserStack', 'mocha'],


    // web server host and port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,

    protocol: 'https',
    httpsServerOptions: {
      key: fs.readFileSync('..//misc/localhost.key', 'utf8'),
      cert: fs.readFileSync('..//misc/localhost.crt', 'utf8')
    },

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    browserStack: {
      username: process.env.BROWSERSTACK_USERNAME,
      accessKey: process.env.BROWSERSTACK_ACCESS_KEY,
      apiClientEndpoint: 'https://api.browserstack.com'
    },

    // define browsers
    customLaunchers: customLaunchers,
    browsers: browsers,

    captureTimeout: 3e5,
    browserDisconnectTolerance: 0,
    browserDisconnectTimeout: 3e5,
    browserSocketTimeout: 1.2e5,
    browserNoActivityTimeout: 3e5,

    concurrency: 1,

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true
  })
}