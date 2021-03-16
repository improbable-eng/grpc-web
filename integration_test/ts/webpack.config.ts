const path = require("path");
const webpack = require("webpack");
module.exports = {
  entry: "./src/spec.ts",
  mode: "development",
  target: "es5",
  output: {
    path: path.resolve(__dirname, "build"),
    filename: "integration-tests.js"
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env": JSON.stringify(process.env),
    }),
  ],
  devtool: "source-map",
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
        include: [/src/, /_proto/],
        exclude: /node_modules/,
        loader: "ts-loader"
      }
    ]
  },
  resolve: {
    fallback: {
      "http": false,
      "https": false,
      "url": false,
    },
    extensions: [".ts", ".js"]
  }
};
