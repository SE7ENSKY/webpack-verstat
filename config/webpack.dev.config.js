const webpackDefinePlugin = require('webpack').DefinePlugin;
const webpackHotModuleReplacementPlugin = require('webpack').HotModuleReplacementPlugin;
const webpackNamedModulesPlugin = require('webpack').NamedModulesPlugin;
// const webpackCommonsChunkPlugin = require('webpack').optimize.CommonsChunkPlugin;
const webpackMerge = require('webpack-merge');
const baseConfig = require('./webpack.base.config');


const devConfig = {
  entry: ['webpack-hot-middleware/client', './assets/main.js'],
  output: {
    publicPath: '/',
    filename: 'assets/[name].min.[hash:8].js'
    // chunkFilename: '[name].min.js' // ?
  },
  devtool: 'cheap-module-source-map',
  // externals: {}, // ?
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader']
      },
      {
        test: /\.(sass|scss)$/,
        use: ['style-loader', 'css-loader', 'postcss-loader', 'sass-loader']
      },
      {
        test: /\.less$/,
        use: ['style-loader', 'css-loader', 'postcss-loader', 'less-loader']
      },
      {
        test: /\.styl$/,
        use: ['style-loader', 'css-loader', 'postcss-loader', 'stylus-loader']
      }
    ]
  },
  plugins: [
    new webpackDefinePlugin({
      'process.env': {
        'NODE_ENV': 'development'
      }
    }),
    new webpackHotModuleReplacementPlugin(),
    new webpackNamedModulesPlugin()
    // new webpackCommonsChunkPlugin({
    //   name: 'vendor',
    //   children: true,
    //   minChunks: 2,
    //   async: true
    // })
  ]
};

module.exports = webpackMerge(baseConfig, devConfig);
