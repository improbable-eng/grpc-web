module.exports = {
    entry: "./src/index.js",
    output: {
        path: __dirname,
        filename: "build/bundle.js"
    },
    module: {
        loaders: [
            { test: /\.css$/, loader: "style!css" },
            { test: /\.js$/, loader: "babel", exclude: /node_modules/ }
        ]
    }
};
