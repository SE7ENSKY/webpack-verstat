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
const YAML = require('yamljs');
// const cssnano = require('cssnano');
// const autoprefixer = require('autoprefixer'); // ?
const bemto = require('../src/vendor/bemto/bemto.js');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const BeautifyHtmlPlugin = require('../custom-plugins/beautify-html-plugin/index');
const ExtractTextPlugin = require('extract-text-webpack-plugin'); // production
const CopyWebpackPlugin = require('copy-webpack-plugin');

const readFile = fileName => fs.readFileSync(fileName, { encoding: 'utf8' });
const basePath = path.resolve(__dirname, '../');

const config = {
  context: `${basePath}/src`,
  entry: {
    main: './main.js',
  },
  output: {
    path: `${basePath}/dist`,
    publicPath: '/assets/',
    filename: 'assets/main.min.js',
  },
  // devtool: 'cheap-module-source-map', // development
  // devtool: 'source-map', // production
  // resolveLoader: {
  //   modules: ['node_modules', 'custom-loaders'],
  // },
  module: {
    rules: [
      {
        test: /\.(eot|woff2?|otf|ttf|svg)/,
        include: `${basePath}/src/assets/fonts`, // ?
        loader: 'file-loader',
        options: {
          name: './fonts/[name].[ext]', // ?
          // publicPath: '../', // ?
        },
      },
      {
        test: /\.(png|jpe?g|svg|gif)$/,
        include: `${basePath}/src/assets/img`, // ?
        use: {
          loader: 'file-loader',
          options: {
            name: './img/[name].[ext]', // ?
            // publicPath: '../', // ?
          },
        },
      },
      {
        test: /\.(mp4|webm|wav|mp3|m4a|aac|oga)$/,
        include: `${basePath}/src/assets/video`, // ?
        use: {
          loader: 'file-loader',
          options: {
            name: './video/[name].[ext]', // ?
            // publicPath: '../', // ?
          },
        },
      },
      {
        test: /\.txt$/,
        use: {
          loader: 'raw-loader',
        },
      },
      {
        test: /\.yaml$/,
        use: {
          loader: 'yaml-loader',
        },
      },
      {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          use: ['css-loader'],
          fallback: 'style-loader',
        }),
      },
      {
        test: /\.(sass|scss)$/,
        use: ExtractTextPlugin.extract({
          use: [
            'css-loader',
            'sass-loader',
          ],
          fallback: 'style-loader',
        }),
      },
      {
        test: /\.less$/,
        use: ExtractTextPlugin.extract({
          use: [
            'css-loader',
            'less-loader',
          ],
          fallback: 'style-loader',
        }),
      },
      {
        test: /\.styl$/,
        use: ExtractTextPlugin.extract({
          use: [
            'css-loader',
            'stylus-loader',
          ],
          fallback: 'style-loader',
        }),
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
        test: /\.(pug|jade)$/,
        use: {
          loader: 'pug-loader',
        },
      },
      {
        test: /\.coffee$/,
        use: {
          loader: 'coffee-loader',
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
    }),
    new CopyWebpackPlugin([{ from: `${basePath}/src/assets/!(fonts)/*` }]),
    new webpack.LoaderOptionsPlugin({
      options: {
        stylus: {
          use: [require('nib')()],
          import: ['~nib/lib/nib/index.styl'],
        },
      },
    }),
    new ExtractTextPlugin('assets/main.min.css'),
    // new webpack.optimize.CommonsChunkPlugin(options),
  ],
};

glob.sync(`${basePath}/src/layouts/!(main|root).?(pug|jade)`).forEach((item) => {
  const templateFileBaseName = path.basename(item, path.extname(item)).replace('frontPage', 'index');
  config.plugins.push(
    new HtmlWebpackPlugin({
      filename: `${templateFileBaseName}.html`, // can specify a subdirectory here too
      template: item,
      // favicon: '', // favicons-webpack-plugin
      inject: false,
      minify: {
        removeComments: true,
      },
      showErrors: false,
      renderBlock: (blockName, data) => {
        const compileTemplate = (mod, block) => {
          const blockFile = glob.sync(`${basePath}/src/components/${block}/${block}.?(pug|jade)`);
          if (blockFile.length) {
            return pug.compile(`${mod}\n${readFile(blockFile[0])}`);
          }
        };
        data.renderBlock = (blockName, data) => compileTemplate(bemto, blockName)(data);
        return compileTemplate(bemto, blockName)(data);
      },
      getLocalData: () => {
        const dataFile = glob.sync(`${basePath}/src/data/local/${templateFileBaseName}.?(json|yml)`);
        if (dataFile.length) {
          switch (path.extname(dataFile[0])) {
            case '.json':
              return JSON.parse(readFile(dataFile[0]));
            case '.yml':
              return YAML.parse(readFile(dataFile[0]));
          }
        }
        return {};
      },
      getGlobalData: () => {
        const globalDataFiles = glob.sync(`${basePath}/src/data/global/*.?(json|yml)`).map((file) => {
          const obj = {};
          switch (path.extname(file)) {
            case '.json':
              obj[path.basename(file, '.json')] = JSON.parse(readFile(file));
              break;
            case '.yml':
              obj[path.basename(file, '.yml')] = YAML.parse(readFile(file));
              break;
          }
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
