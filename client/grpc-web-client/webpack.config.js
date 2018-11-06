const path = require('path');
const packageJson = require("./package.json");

const LIB_BASE_CONFIG = {
  entry: "./src/index.ts",
  module: {
    rules: [{
      test: /\.ts?$/,
      use: 'ts-loader',
      exclude: /node_modules/
    }]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
};
const DIST_DIR = path.resolve(__dirname, 'dist');

module.exports = [{
    name: 'lib-commonjs',
    ...LIB_BASE_CONFIG,
    output: {
      filename: `${packageJson.name}.js`,
      path: DIST_DIR,
      libraryTarget: 'commonjs',
    }
  },
  {
    name: 'lib-umd',
    ...LIB_BASE_CONFIG,
    output: {
      filename: `${packageJson.name}.umd.js`,
      path: DIST_DIR,
      libraryTarget: 'umd',
    }
  },
];
