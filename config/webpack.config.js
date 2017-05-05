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


const config = {
  entry: {
    main: path.resolve(__dirname, '../src/main.js'),
  },
  output: {
    path: path.resolve(__dirname, '../dist'),
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
        // include: path.resolve('data'), // ?
        use: {
          loader: 'yaml-loader',
        },
      },
      {
        test: /\.coffee$/,
        use: {
          loader: 'coffee-loader',
        },
      },
      {
        test: /\.html$/,
        use: {
          loader: 'html-loader',
          options: {
            minimize: false,
          },
        },
      },
      {
        test: /\.pug$/,
        use: {
          loader: 'pug-loader',
        },
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
      _: 'lodash', // поштучно!
    }),
    // new webpack.optimize.CommonsChunkPlugin(options),
  ],
};

glob.sync(`${path.resolve(__dirname, '../src/layouts')}/!(main|root).pug`).forEach((item) => {
  const fileBaseName = path.basename(item, '.pug').replace('frontPage', 'index');
  config.plugins.push(
    new HtmlWebpackPlugin({
      filename: `${fileBaseName}.html`,
      template: item,
      minify: {
        removeComments: true,
      },
      showErrors: false,
      renderBlock: (blockName, data) => {
        const compileTemplate = (mod, block) => {
          const readFile = fileName => fs.readFileSync(fileName, { encoding: 'utf8' });
          return pug.compile(`${mod}\n${readFile(`${path.resolve(__dirname, '../src/components')}/${block}/${block}.pug`)}`);
        };

        data.renderBlock = (blockName, data) => compileTemplate(bemto, blockName)(data);
        return compileTemplate(bemto, blockName)(data);
      },
      getTemplateData: () => {
        const dataFile = `${path.resolve(__dirname, '../src/data')}/${fileBaseName}.json`;
        const readFile = fileName => fs.readFileSync(fileName, { encoding: 'utf8' });

        if (fs.existsSync(dataFile)) return readFile(dataFile);
      },
      getGlobalData: () => {},
    })
  );
});

// production
config.plugins.push(new BeautifyHtmlPlugin({ ocd: true }));

module.exports = config;
