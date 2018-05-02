const path = require('path');
const webpack = require('webpack');
module.exports = {
  entry: "./src/spec.ts",
  mode: "development",
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'integration-tests.js'
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(process.env),
    }),
  ],
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.js$/,
        include: /src/,
        loader: "babel-loader",
        exclude: /node_modules/
      },
      {
        test: /\.ts$/,
        include: [/src/, /_proto/, /suiteUtils/],
        exclude: /node_modules/,
        loader: "ts-loader"
      }
    ]
  },
  resolve: {
    extensions: [".ts", ".js"]
  }
};
