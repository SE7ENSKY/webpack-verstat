// TODO gsap і immutable
// TODO видалити pretty після npm-релізу
// TODO <link rel='preload'> і загальна оптимізація
// TODO modernizrrc
// TODO purifycss-webpack ?
// TODO prepack-webpack-plugin ?

const webpackDefinePlugin = require('webpack').DefinePlugin;
const webpackNoEmitOnErrorsPlugin = require('webpack').NoEmitOnErrorsPlugin;
const webpackProvidePlugin = require('webpack').ProvidePlugin;
const webpackLoaderOptionsPlugin = require('webpack').LoaderOptionsPlugin;
const webpackWatchIgnorePlugin = require('webpack').WatchIgnorePlugin;
const webpackHotModuleReplacementPlugin = require('webpack').HotModuleReplacementPlugin;
const webpackNamedModulesPlugin = require('webpack').NamedModulesPlugin;
// const webpackCommonsChunkPlugin = require('webpack').optimize.CommonsChunkPlugin;
const pathResolve = require('path').resolve;
const pathJoin = require('path').join;
const pathBasename = require('path').basename;
const pathExtname = require('path').extname;
const globSync = require('glob').sync;
const fsReadFileSync = require('fs').readFileSync;
const pugCompile = require('pug').compile;
const yamlParse = require('yamljs').parse;
const nib = require('nib');
const autoprefixer = require('autoprefixer');
const bemto = require('../src/vendor/bemto/bemto.js');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackHarddiskPlugin = require('html-webpack-harddisk-plugin');

const readFile = fileName => fsReadFileSync(fileName, { encoding: 'utf8' });
const basePath = pathResolve(__dirname, '../');
// const templates = globSync(`${basePath}/src/layouts/!(main|root).?(pug|jade)`);

const compileTemplate = (mod, block) => {
  const blockFile = globSync(`${basePath}/src/components/${block}/${block}.?(pug|jade)`);
  if (blockFile.length) {
    return pugCompile(`${mod}\n${readFile(blockFile[0])}`);
  }
};
const renderBlockEngine = (blockName, data) => {
  data.renderBlock = (blockName, data) => compileTemplate(bemto, blockName)(data);
  return compileTemplate(bemto, blockName)(data);
};
const localDataEngine = (templateFileBaseName) => {
  const dataFile = globSync(`${basePath}/src/data/local/${templateFileBaseName}.?(json|yml)`);
  if (dataFile.length) {
    switch (pathExtname(dataFile[0])) {
      case '.json':
        return JSON.parse(readFile(dataFile[0]));
      case '.yml':
        return yamlParse(readFile(dataFile[0]));
    }
  }
  return {};
};
const globalDataEngine = () => {
  const globalDataFiles = globSync(`${basePath}/src/data/global/*.?(json|yml)`).map((file) => {
    const obj = {};
    switch (pathExtname(file)) {
      case '.json':
        obj[pathBasename(file, '.json')] = JSON.parse(readFile(file));
        break;
      case '.yml':
        obj[pathBasename(file, '.yml')] = yamlParse(readFile(file));
        break;
    }
    return obj;
  });
  return globalDataFiles.length ? Object.assign({}, ...globalDataFiles) : {};
};

const config = {
  context: `${basePath}/src`,
  entry: ['webpack-hot-middleware/client', './pages/index.js'],
  output: {
    path: `${basePath}/dist`,
    publicPath: '/',
    filename: 'assets/[name].min.[hash:8].js'
    // chunkFilename: '[name].min.js' // ?
  },
  devtool: 'cheap-module-source-map',
  // externals: {}, // ?
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
      },
      {
        test: /\.html$/,
        use: {
          loader: 'html-loader',
          options: {
            minimize: false
          }
        }
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
    new webpackDefinePlugin({
      'process.env': {
        'NODE_ENV': 'development'
      }
    }),
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
    new webpackWatchIgnorePlugin([pathJoin(__dirname, 'node_modules')]),
    new webpackHotModuleReplacementPlugin(), // HMR
    new webpackNamedModulesPlugin() // HMR
    // new webpackCommonsChunkPlugin({
    //   name: 'vendor',
    //   children: true,
    //   minChunks: 2,
    //   async: true
    // })
  ]
};

// templates.forEach((item) => {
//   const templateFileBaseName = pathBasename(item, pathExtname(item)).replace('frontPage', 'index'); // оптимізувати
//   config.plugins.push(
//     new HtmlWebpackPlugin({
//       filename: `${templateFileBaseName}.html`, // can specify a subdirectory here too
//       template: item,
//       cache: false,
//       hash: true,
//       inject: false,
//       minify: {
//         removeComments: true
//       },
//       showErrors: false,
//       isProduction: false,
//       renderBlock: renderBlockEngine,
//       getLocalData: () => localDataEngine(templateFileBaseName),
//       getGlobalData: globalDataEngine
//     })
//   );
// });

config.plugins.push(
  new HtmlWebpackPlugin({
    filename: 'index.html',
    template: `${basePath}/src/layouts/index.pug`,
    cache: false,
    hash: false,
    inject: 'body',
    alwaysWriteToDisk: true,
    minify: {
      removeComments: true
    },
    showErrors: false,
    isProduction: false,
    renderBlock: renderBlockEngine,
    getLocalData: () => localDataEngine('index'),
    getGlobalData: globalDataEngine
  })
);

config.plugins.push(new HtmlWebpackHarddiskPlugin());

module.exports = config;
