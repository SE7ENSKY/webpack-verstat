const pathExtname = require('path').extname;
const pathBasename = require('path').basename;
const basePath = require('./webpack.config.utils').basePath;
const globSync = require('glob').sync;
const webpackDefinePlugin = require('webpack').DefinePlugin;
const webpackHotModuleReplacementPlugin = require('webpack').HotModuleReplacementPlugin;
const webpackNamedModulesPlugin = require('webpack').NamedModulesPlugin;
// const webpackCommonsChunkPlugin = require('webpack').optimize.CommonsChunkPlugin;
const HtmlWebpackPlugin = require('html-webpack-plugin');
// const HtmlWebpackHarddiskPlugin = require('html-webpack-harddisk-plugin');
const webpackMerge = require('webpack-merge');
const baseConfig = require('./webpack.base.config');
const renderBlockEngine = require('./webpack.config.utils').renderBlockEngine;
const localDataEngine = require('./webpack.config.utils').localDataEngine;
const globalDataEngine = require('./webpack.config.utils').globalDataEngine;


const templates = globSync(`${basePath}/src/layouts/!(main|root).?(pug|jade)`);
const entries = globSync(`${basePath}/src/pages/*.js`).map(item => `./pages/${pathBasename(item)}`);

const devConfig = {
  entry: ['webpack-hot-middleware/client', ...entries],
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

templates.forEach((item) => {
  const templateFileBaseName = pathBasename(item, pathExtname(item)).replace('frontPage', 'index'); // оптимізувати
  devConfig.plugins.push(
    new HtmlWebpackPlugin({
      filename: `${templateFileBaseName}.html`, // can specify a subdirectory here too
      template: item,
      cache: false,
      hash: false,
      inject: 'body',
      // alwaysWriteToDisk: true,
      minify: {
        removeComments: true
      },
      showErrors: false,
      isProduction: false,
      renderBlock: renderBlockEngine,
      getLocalData: () => localDataEngine(templateFileBaseName),
      getGlobalData: globalDataEngine
    })
  );
});

// devConfig.plugins.push(new HtmlWebpackHarddiskPlugin());

module.exports = webpackMerge(baseConfig, devConfig);
