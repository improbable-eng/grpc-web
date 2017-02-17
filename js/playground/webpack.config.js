module.exports = {
    entry: "./src/index.js",
    devtool: 'inline-source-map',
    output: {
        path: __dirname,
        filename: "build/bundle.js"
    },
    module: {
        loaders: [
            { test: /\.js$/, loader: "babel", exclude: /node_modules/ }
        ]
    }
};
