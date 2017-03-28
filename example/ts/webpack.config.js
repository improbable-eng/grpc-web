const webpack = require('webpack');
const path = require('path');

module.exports = {
  entry: "./src/index.ts",
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'bundle.js'
  },
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
        include: /src/,
        exclude: /node_modules/,
        loader: "babel-loader?cacheDirectory!ts-loader"
      }
    ]
  },
  resolve: {
    extensions: [".ts", ".js"]
  },
  plugins: [
    new webpack.DefinePlugin({
      'USE_TLS': process.env.USE_TLS !== undefined
    })
  ]
};
