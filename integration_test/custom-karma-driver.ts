import { Builder } from 'selenium-webdriver';
const sauceConnectLauncher = require('sauce-connect-launcher');
import { corsHost, testHost } from "./hosts-config";

const username = process.env.SAUCELABS_USERNAME;
const accessKey = process.env.SAUCELABS_ACCESS_KEY;
const buildName = process.env.TRAVIS_BUILD_NUMBER ? `travis_${process.env.TRAVIS_BUILD_NUMBER}` : `local_${new Date().getTime()}`;

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


function LocalTunnel(logger, useSslBumping, cb) {
  let sauceConnectProxy = null;
  const tunnelIdentifier = `tunnel-${Math.random()}`;
  sauceConnectLauncher({
    username: username,
    accessKey: accessKey,
    noSslBumpDomains: useSslBumping ? undefined : `${testHost},${corsHost}`,
    logger: (stdout) => console.log(stdout),
    tunnelIdentifier: tunnelIdentifier
  }, (err, sc) => {
    if (err !== null) {
      console.log("Sauce connect error", err)
      cb(err, tunnelIdentifier)
      return;
    }
    console.log("Sauce connect initialised with tunnelIdentifier", tunnelIdentifier);
    sauceConnectProxy = sc;
    cb(null, tunnelIdentifier)
  });

  this.dispose = function (cb) {
    console.log("Tunnel.Dispose");
    sauceConnectProxy.close(() => {
      console.log("Tunnel.DidClose");
      cb(null);
    });
  }
}

function pollTitleToKeepAlive(self: any, browser: any) {
  // To avoid SauceLabs killing the session because there is no interaction with the page
  // poll the title of the page to keep the session alive.
  const interval = setInterval(function () {
    if (self.ended) {
      clearInterval(interval);
      return;
    }
    browser.getTitle().catch((err) => {
      if (err) {
        console.error("Failed to get page title: ", err);
        clearInterval(interval);
      }
    });
  }, 25000);
}

function CustomWebdriverBrowser(id, baseBrowserDecorator, args, logger) {
  baseBrowserDecorator(this);
  const self = this;

  self.name = args.configName;
  self.log = logger.create(`launcher.selenium-webdriver: ${self.name}`);
  self.captured = false;
  self.ended = false;
  self.id = id;
  const caps = args.capabilities;
  self._start = (testUrl) => {
    const testUrlWithSuite = `${testUrl}#${caps.testSuite ? caps.testSuite : ''}`;
    self.localTunnel = new LocalTunnel(self.log, caps.useSslBumping || false, (err, tunnelIdentifier) => {
      if (err) {
        return self.log.error("Could not create local testing", err);
      }

      self.log.debug('Local Tunnel Connected. Now testing...');
      let browser = new Builder()
        .withCapabilities({
          'browserName': caps.browserName,
          'platform': caps.os,
          'version': caps.browserVersion,
          'build': buildName,
          'username': username,
          'accessKey': accessKey,
          'tunnelIdentifier': tunnelIdentifier,
          'recordScreenshots': false,
          'acceptSslCerts': true,
          'acceptInsecureCerts': true,
          'javascriptEnabled': true,
        })
        .usingServer("https://" + username + ":" + accessKey +
          "@ondemand.saucelabs.com:443/wd/hub")
        .build();

      console.log("Built webdriver");

      self.browser = browser;
      if (caps.edgeAcceptSsl) {
        const next = (i) => {
          const via = viaUrls[i];
          if (!via) {
            console.log("Navigating to ", testUrlWithSuite);
            browser.get(testUrlWithSuite).then(() => {
              console.log("Did capture");
              self.captured = true;

              console.log("Attempting to bypass cert issue on final")
              browser.get("javascript:document.getElementById('invalidcert_continue').click()");
              // This will wait on the page until the browser is killed

              pollTitleToKeepAlive(self, browser);
            });
          } else {
            browser.get(via).then(() => {
              console.log("Attempting to bypass cert issue")
              browser.get("javascript:document.getElementById('invalidcert_continue').click()").then(() => {
                next(i + 1);
              });
            }).catch(err => {
              console.error("Failed to navigate via page", err);
            });
          }
        };
        next(0);
      } else {
        console.log("Navigating to ", testUrlWithSuite);
        browser.get(testUrlWithSuite).then(() => {
          console.log("Did capture");
          self.captured = true;

          pollTitleToKeepAlive(self, browser);
        });
      }
    });
  };

  this.on('kill', function (done) {
    self.ended = true;
    self.localTunnel.dispose(function () {
      self.browser.quit().finally(() => {
        self._done();
        done();
      });
    });
  });

  self.isCaptured = function () {
    return self.captured;
  };
}

export default {
  'launcher:CustomWebDriver': ['type', CustomWebdriverBrowser]
};
