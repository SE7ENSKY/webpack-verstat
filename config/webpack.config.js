// TODO gsap і immutable
// TODO видалити pretty після npm-релізу
// TODO зробить розумний svgo
// TODO перевести на webpack-blocks
// TODO <link rel="preload"> і загальна оптимізація

const webpack = require('webpack');
const path = require('path');
const glob = require('glob');
const fs = require('fs');
const pug = require('pug');
const bemto = require('../src/vendor/bemto/bemto.js');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const BeautifyHtmlPlugin = require('../custom-plugins/beautify-html-plugin/index');
// const ROOT = path.resolve('node_modules').replace('node_modules', '');
// const ExtractTextPlugin = require('extract-text-webpack-plugin');
// const CopyWebpackPlugin = require('copy-webpack-plugin'); // install

const readFile = fileName => fs.readFileSync(fileName, { encoding: 'utf8' });
const appPaths = {
  webpackPaths: {
    context: path.resolve(__dirname, '../src'),
    output: path.resolve(__dirname, '../dist'),
  },
  dirPaths: {
    layouts: `${path.resolve(__dirname, '../src/layouts')}/!(main|root).pug`,
    getComponent: fileName => `${path.resolve(__dirname, '../src/components')}/${fileName}/${fileName}.pug`,
    getLocalDataFile: fileName => `${path.resolve(__dirname, '../src/data/local')}/${fileName}.json`,
    globalDataFiles: `${path.resolve(__dirname, '../src/data/global')}/*.json`,
  },
};

const config = {
  context: appPaths.webpackPaths.context,
  entry: {
    main: './main.js',
  },
  output: {
    path: appPaths.webpackPaths.output,
    publicPath: '/assets/',
    filename: 'main.js',
  },
  // devtool: 'cheap-module-source-map', // development
  // devtool: 'source-map', // production
  // resolveLoader: {
  //   modules: ['node_modules', 'custom-loaders'],
  // },
  module: {
    rules: [
      {
        test: /\.yaml$/,
        use: { loader: 'yaml-loader' },
      },
      {
        test: /\.coffee$/,
        use: { loader: 'coffee-loader' },
      },
      {
        test: /\.html$/,
        use: {
          loader: 'html-loader',
          options: { minimize: false },
        },
      },
      {
        test: /\.pug$/,
        use: { loader: 'pug-loader' },
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
            presets: [['es2015', { loose: true, modules: false }]],
          },
        },
      },
    ],
  },
  plugins: [
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
    }),
    // new webpack.optimize.CommonsChunkPlugin(options),
  ],
};

glob.sync(appPaths.dirPaths.layouts).forEach((item) => {
  const templateFileBaseName = path.basename(item, '.pug').replace('frontPage', 'index');
  config.plugins.push(
    new HtmlWebpackPlugin({
      filename: `${templateFileBaseName}.html`,
      template: item,
      minify: { removeComments: true },
      showErrors: false,
      renderBlock: (blockName, data) => {
        const compileTemplate = (mod, block) => pug.compile(`${mod}\n${readFile(appPaths.dirPaths.getComponent(block))}`);
        data.renderBlock = (blockName, data) => compileTemplate(bemto, blockName)(data);
        return compileTemplate(bemto, blockName)(data);
      },
      getLocalData: () => {
        const dataFile = appPaths.dirPaths.getLocalDataFile(templateFileBaseName);
        return fs.existsSync(dataFile) ? JSON.parse(readFile(dataFile)) : {};
      },
      getGlobalData: () => {
        const globalDataFiles = glob.sync(appPaths.dirPaths.globalDataFiles).map((file) => {
          const obj = {};
          obj[path.basename(file, '.json')] = JSON.parse(readFile(file));
          return obj;
        });
        return globalDataFiles.length ? Object.assign({}, ...globalDataFiles) : {};
      },
    })
  );
});

// production
config.plugins.push(new BeautifyHtmlPlugin({ ocd: true }));

module.exports = config;
