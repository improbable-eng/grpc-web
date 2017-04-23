// Https Karma configuration - for browsers that support https on BrowserStack

const sharedConfigGenerator = require("./shared-karma-conf.js");
const fs = require("fs");
const customLaunchers = require("./browsers");

module.exports = function(config) {
  const useBrowserStack = process.env.BROWSER_STACK_USERNAME !== undefined;
  const browsers = useBrowserStack ? Object.keys(customLaunchers) : [];
  const settings = sharedConfigGenerator(false, useBrowserStack);
  settings.browsers = browsers;
  settings.customLaunchers = customLaunchers;
  config.set(settings)
};
