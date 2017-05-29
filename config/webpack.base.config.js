const pathJoin = require('path').join;
const basePath = require('./webpack.config.utils').basePath;
const webpackNoEmitOnErrorsPlugin = require('webpack').NoEmitOnErrorsPlugin;
const webpackProvidePlugin = require('webpack').ProvidePlugin;
const webpackLoaderOptionsPlugin = require('webpack').LoaderOptionsPlugin;
const webpackWatchIgnorePlugin = require('webpack').WatchIgnorePlugin;
const CopyWebpackPlugin = require('copy-webpack-plugin');
const nib = require('nib');
const autoprefixer = require('autoprefixer');


const baseConfig = {
  context: `${basePath}/src`,
  output: {
    path: `${basePath}/dist`
  },
  module: {
    rules: [
      {
        test: /\.txt$/,
        use: 'raw-loader'
      },
      {
        test: /\.yaml$/,
        use: 'yaml-loader'
      },
      {
        test: /\.md$/,
        use: ['html-loader', 'markdown-loader']
      },
      {
        test: /\.html$/,
        use: 'html-loader'
      },
      {
        test: /\.(pug|jade)$/,
        use: 'pug-loader'
      },
      {
        test: /\.coffee$/,
        use: 'coffee-loader'
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,
            babelrc: false,
            plugins: ['transform-runtime'],
            presets: [['es2015', { modules: false }]]
          }
        }
      }
    ]
  },
  plugins: [
    new webpackNoEmitOnErrorsPlugin(),
    new webpackProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery'
    }),
    new CopyWebpackPlugin([{ from: `${basePath}/src/assets/**/*` }]),
    new webpackLoaderOptionsPlugin({
      options: {
        stylus: {
          use: [nib()],
          import: [`${basePath}/src/vendor/nib/index.styl`]
        },
        postcss: [
          autoprefixer({
            browsers: ['last 5 versions']
          })
        ]
      }
    }),
    new webpackWatchIgnorePlugin([pathJoin(__dirname, 'node_modules')])
  ]
};

module.exports = baseConfig;
