var path = require('path');
var webpack = require('webpack');

module.exports = {
  entry: path.resolve(__dirname, 'src', 'index.js'),
  module: {
    rules: [
      {
        exclude: /node_modules/,
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-env',
                {
                  corejs: 3,
                  debug: true,
                  targets: "> 0.25%, not IE 11, not dead",
                  useBuiltIns: 'usage'
                }
              ]
            ]
          }
        }
      }
    ]
  },
  output: {
    filename: 'mslto.min.js',
    library: 'mslto',
    libraryTarget: 'umd',
    path: path.resolve(__dirname, 'dist')
  },
  target: 'web'
};
