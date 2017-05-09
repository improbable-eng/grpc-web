const wd = require('wd');
const browserstack = require('browserstack-local');
import * as _ from "lodash";
import {testHost, corsHost} from "./hosts-config";
const username = process.env.BROWSER_STACK_USERNAME;
const accessKey = process.env.BROWSER_STACK_ACCESS_KEY;
const seleniumHost = 'hub-cloud.browserstack.com';
const seleniumPort = 80;

const viaUrls = [
  // HTTP 1.1
  "https://" + testHost + ":9090",
  "https://" + testHost + ":9095",
  "https://" + corsHost + ":9090",
  "https://" + corsHost + ":9095",
  // HTTP 2
  "https://" + testHost + ":9100",
  "https://" + testHost + ":9105",
  "https://" + corsHost + ":9100",
  "https://" + corsHost + ":9105"
];

let tunnelId = null;
let bs_local = null;
let localCallbacks = [];
const localTunnels = [];
function LocalTunnel(logger, cb) {
  localTunnels.push(this);

  if (tunnelId !== null) {
    cb(null, tunnelId);
  } else {
    localCallbacks.push(cb);
    const tunnelIdentifier = `tunnel-${Math.random()}`;
    if (localCallbacks.length === 1) {
      bs_local = new browserstack.Local();
      bs_local.start({
        'key': accessKey,
        'localIdentifier': tunnelIdentifier
      }, function (error) {
        tunnelId = tunnelIdentifier;
        localCallbacks.forEach(cb => {
          cb(error, tunnelIdentifier)
        });
        localCallbacks = [];
      });
    }
  }

  this.dispose = function(cb){
    localTunnels.splice(localTunnels.indexOf(this), 1);
    if (localTunnels.length === 0) {
      tunnelId = null;
      bs_local.stop(function(){
        cb(null);
      });
    } else {
      cb(null);
    }
  }
}

function CustomWebdriverBrowser(id, baseBrowserDecorator, args, logger) {
  baseBrowserDecorator(this);
  const self = this;
  const capabilities = args.capabilities;
  self.name = capabilities.browserName + ' - ' + capabilities.browserVersion + ' - ' + capabilities.os + ' ' + capabilities.os_version;
  self.log = logger.create('launcher.selenium-webdriver: ' + self.name);
  self.captured = false;
  self.id = id;
  self._start = (testUrl) => {
    self.localTunnel = new LocalTunnel(self.log, (err, tunnelIdentifier) => {
      if (err) {
        return self.log.error("Could not create local testing", err);
      }

      self.log.debug('Local Tunnel Connected. Now testing...');
      const browser = wd.remote(seleniumHost, seleniumPort, username, accessKey);
      self.browser = browser;
      browser.on('status', function(info) {
        self.log.debug(info);
      });
      browser.on('command', function(eventType, command, response) {
        self.log.debug(' > ' + eventType, command, (response || ''));
      });
      browser.on('http', function(meth, path, data) {
        self.log.debug(' > ' + meth, path, (data || ''));
      });
      const bsCaps = _.assign({
        "project": process.env.TRAVIS_BRANCH || "dev",
        "acceptSslCerts": true,
        "defaultVideo": true,
        "browserstack.local": true,
        "browserstack.tunnel": true,
        "browserstack.debug": true,
        "tunnelIdentifier": tunnelIdentifier,
        "browserstack.localIdentifier": tunnelIdentifier
      }, capabilities);
      browser.init(bsCaps, function(err) {
        if (err) {
          self.log.error("browser.init", err);
          throw err;
        }
        const next = (i) => {
          const via = viaUrls[i];
          if (!via) {
            browser.get(testUrl, function() {
              self.captured = true;
              // This will wait on the page until the browser is killed
            });
          } else {
            browser.get(via, function () {
              next(i + 1);
            });
          }
        };
        next(0);
      });
    });
  };

  this.on('kill', function(done){
    self.localTunnel.dispose(function(){
      self.browser.quit(function(err) {
        self._done();
        done();
      });
    });
  });

  self.isCaptured = function() {
    return self.captured;
  };
}

export default {
  'launcher:CustomWebDriver': ['type', CustomWebdriverBrowser]
};
