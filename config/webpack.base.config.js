const pathResolve = require('path').resolve;
const pathJoin = require('path').join;
const basePath = pathResolve(__dirname, '../');
const nib = require('nib');
const autoprefixer = require('autoprefixer');
const webpackNoEmitOnErrorsPlugin = require('webpack').NoEmitOnErrorsPlugin;
const webpackProvidePlugin = require('webpack').ProvidePlugin;
const webpackLoaderOptionsPlugin = require('webpack').LoaderOptionsPlugin;
const webpackWatchIgnorePlugin = require('webpack').WatchIgnorePlugin;
const webpackDefinePlugin = require('webpack').DefinePlugin;
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CircularDependencyPlugin = require('circular-dependency-plugin');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const configUtils = require('./webpack.config.utils');


const baseConfig = {
  context: `${basePath}/src`,
  output: {
    path: `${basePath}/dist`
  },
  resolve: {
    modules: [
      'node_modules',
      pathResolve(basePath, 'src')
    ]
  },
  target: 'web',
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
            presets: [
              [
                "env",
                {
                  "targets": {
                    'browsers': [
                      'last 4 versions',
                      'ie >= 10'
                    ]
                  },
                  "modules": false,
                  "loose": true
                }
              ]
            ]
          }
        }
      }
    ]
  },
  plugins: [
    // new BundleAnalyzerPlugin(), // bundle analyzer
    new webpackDefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV)
      }
    }),
    ...configUtils.getCompiledTemplate(),
    new webpackNoEmitOnErrorsPlugin(),
    new webpackProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery'
    }),
    new CopyWebpackPlugin([
      { from: `${basePath}/src/assets/fonts`, to: `${basePath}/dist/assets/fonts` },
      { from: `${basePath}/src/assets/img`, to: `${basePath}/dist/assets/img` },
      { from: `${basePath}/src/assets/video`, to: `${basePath}/dist/assets/video` }
    ]),
    new webpackLoaderOptionsPlugin({
      options: {
        stylus: {
          use: [nib()],
          import: [configUtils.getNibModification(require.resolve('verstat-nib'))]
        },
        postcss: [
          autoprefixer({
            browsers: ['last 5 versions']
          })
        ]
      }
    }),
    new webpackWatchIgnorePlugin([pathJoin(basePath, 'node_modules')]),
    new CircularDependencyPlugin({
      exclude: /node_modules/,
      failOnError: true
    })
  ]
};

module.exports = baseConfig;
