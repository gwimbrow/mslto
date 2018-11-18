const path = require("path");
const webpack = require("webpack");

function resolve(...parts) {
    return path.resolve(__dirname, ...parts);
}

module.exports = {
    entry: resolve("lib", "index.js"),
    mode: "development",
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: resolve("node_modules"),
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: [
                            "@babel/env"
                        ]
                    }
                }
            }
        ]
    },
    output: {
        filename: "mslto.min.js",
        library: "mslto",
        libraryTarget: "umd",
        path: resolve("dist")
    },
    resolve: {
        modules: [
            resolve("lib"),
            resolve("node_modules")
        ]
    }
};
