import * as fs from 'fs';
import customLaunchers from './browsers';
import customKarmaDriver from './custom-karma-driver';
import {testHost} from './hosts-config';

export default (config) => {
  const DEBUG = process.env.DEBUG !== undefined;
  const useBrowserStack = process.env.BROWSER_STACK_USERNAME !== undefined;
  const browsers = useBrowserStack ? Object.keys(customLaunchers) : [];

  config.set({
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
    reporters: ['dots'],
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
      runInParent: true,
      useIframe: false
    },
    plugins: [
      customKarmaDriver,
      {'preprocessor:config-inject': [
        'factory', () =>
          (content, file, done) =>
            done(`window.DEBUG = ${DEBUG};\n${content}`)
      ]},
      'karma-sourcemap-loader',
      'karma-jasmine'
    ],
    autoWatch: true,
    captureTimeout: 120000,
    browserDisconnectTimeout: 60000,
    browserNoActivityTimeout: 60000,
    singlerun: useBrowserStack,
    concurrency: 2,
    customLaunchers: customLaunchers,
    browsers: browsers
  });
};
