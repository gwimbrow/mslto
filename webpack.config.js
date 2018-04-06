const path = require("path");
const webpack = require("webpack");

function resolve(...parts) {
    return path.resolve(__dirname, ...parts);
}

module.exports = {
    devtool: "#source-map",
    entry: resolve("lib", "index.js"),
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: resolve("node_modules"),
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
        path: resolve("dist")
    },
    plugins: [
        new webpack.optimize.UglifyJsPlugin({
            mangle: false,
            sourceMap: true
        })
    ],
    resolve: {
        modules: [
            resolve("lib"),
            resolve("node_modules")
        ]
    }
};
