const path = require("path");
const webpack = require("webpack");

module.exports = {
    devtool: "#source-map",
    entry: [
        "babel-polyfill",
        path.resolve(__dirname, "./index.js")
    ],
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: path.resolve(__dirname, "node_modules"),
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: [
                            "env"
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
        path: path.resolve(__dirname, "dist")
    },
    plugins: [
        new webpack.optimize.UglifyJsPlugin({
            mangle: false,
            sourceMap: true
        })
    ],
    resolve: {
        modules: [
            path.resolve(__dirname, "lib"),
            path.resolve(__dirname, "node_modules")
        ]
    }
};
