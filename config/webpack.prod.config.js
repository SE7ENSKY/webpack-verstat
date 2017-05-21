// TODO gsap і immutable
// TODO видалити pretty після npm-релізу
// TODO перевести на webpack-blocks
// TODO <link rel="preload"> і загальна оптимізація
// TODO modernizrrc
// TODO purifycss-webpack ?
// TODO prepack-webpack-plugin ?
// TODO допилить development server і hmr

const webpackDefinePlugin = require('webpack').DefinePlugin;
const webpackNoEmitOnErrorsPlugin = require('webpack').NoEmitOnErrorsPlugin;
const webpackProvidePlugin = require('webpack').ProvidePlugin;
const webpackLoaderOptionsPlugin = require('webpack').LoaderOptionsPlugin;
const webpackWatchIgnorePlugin = require('webpack').WatchIgnorePlugin;
// const webpackHotModuleReplacementPlugin = require('webpack').HotModuleReplacementPlugin;
// const webpackNamedModulesPlugin = require('webpack').NamedModulesPlugin;
// const webpackCommonsChunkPlugin = require('webpack').optimize.CommonsChunkPlugin;
const webpackUglifyJsPlugin = require('webpack').optimize.UglifyJsPlugin;
const pathResolve = require('path').resolve;
const pathJoin = require('path').join;
const pathBasename = require('path').basename;
const pathExtname = require('path').extname;
const globSync = require('glob').sync;
const fsReadFileSync = require('fs').readFileSync;
const pugCompile = require('pug').compile;
const yamlParse = require('yamljs').parse;
const autoprefixer = require('autoprefixer');
const bemto = require('../src/vendor/bemto/bemto.js');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const BeautifyHtmlPlugin = require('../custom-plugins/beautify-html-plugin/index');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

const readFile = fileName => fsReadFileSync(fileName, { encoding: 'utf8' });
const basePath = pathResolve(__dirname, '../');
const isProduction = process.env.NODE_ENV === 'production';
const developmentServerConfig = {
  contentBase: `${basePath}/dist`,
  historyApiFallback: {
    disableDotRule: true
  },
  compress: false,
  hot: false,
  // open: true, // HMR
  inline: true,
  host: 'localhost',
  port: 8080,
  stats: {
    colors: true
  }
};
const templates = globSync(`${basePath}/src/layouts/!(main|root).?(pug|jade)`);
const cssDevelopmentLoaders = ['style-loader', 'css-loader', 'postcss-loader'];
const sassDevelopmentLoaders = [...cssDevelopmentLoaders, 'sass-loader'];
const lessDevelopmentLoaders = [...cssDevelopmentLoaders, 'less-loader'];
const stylusDevelopmentLoaders = [...cssDevelopmentLoaders.filter(value => value !== 'postcss-loader'), 'stylus-loader'];
const cssProductionLoaders = {
  use: [
    {
      loader: 'css-loader',
      options: {
        minimize: {
          discardComments: {
            removeAll: true
          },
          discardDuplicates: true
        }
      }
    },
    'postcss-loader'
  ],
  fallback: [
    'style-loader',
    'postcss-loader'
  ]
};
const sassProductionLoaders = Object.assign(
  {},
  cssProductionLoaders,
  { use: [...cssProductionLoaders.use, 'sass-loader'] }
);
const lessProductionLoaders = Object.assign(
  {},
  cssProductionLoaders,
  { use: [...cssProductionLoaders.use, 'less-loader'] }
);
const stylusProductionLoaders = Object.assign(
  {},
  cssProductionLoaders,
  {
    use: [...cssProductionLoaders.use.filter(value => value !== 'postcss-loader'), 'stylus-loader'],
    fallback: [...cssProductionLoaders.fallback.filter(value => value !== 'postcss-loader'), 'stylus-loader']
  }
);

const renderBlockEngine = (blockName, data) => {
  const compileTemplate = (mod, block) => {
    const blockFile = globSync(`${basePath}/src/components/${block}/${block}.?(pug|jade)`);
    if (blockFile.length) {
      return pugCompile(`${mod}\n${readFile(blockFile[0])}`);
    }
  };
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
  entry: ['./main.js'],
  output: {
    path: `${basePath}/dist`,
    publicPath: '/assets/',
    // publicPath: '/', // HMR
    filename: isProduction ? 'assets/[name].min.js' : 'assets/[name].min.[hash].js'
    // chunkFilename: '[name].min.js' // ?
  },
  devtool: isProduction ? 'cheap-module-source-map' : 'source-map',
  devServer: developmentServerConfig,
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
        use: isProduction ? ExtractTextPlugin.extract(cssProductionLoaders) : cssDevelopmentLoaders
      },
      {
        test: /\.(sass|scss)$/,
        use: isProduction ? ExtractTextPlugin.extract(sassProductionLoaders) : sassDevelopmentLoaders
      },
      {
        test: /\.less$/,
        use: isProduction ? ExtractTextPlugin.extract(lessProductionLoaders) : lessDevelopmentLoaders
      },
      {
        test: /\.styl$/,
        use: isProduction ? ExtractTextPlugin.extract(stylusProductionLoaders) : stylusDevelopmentLoaders
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
        'NODE_ENV': process.env.NODE_ENV ? process.env.NODE_ENV : 'production'
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
          use: [require('nib')()],
          import: ['~nib/lib/nib/index.styl']
        },
        postcss: [
          autoprefixer({
            browsers: ['last 5 versions']
          })
        ]
      }
    }),
    new webpackWatchIgnorePlugin([pathJoin(__dirname, 'node_modules')]),
    new ExtractTextPlugin({
      filename: 'assets/[name].min.css',
      disable: !isProduction,
      allChunks: true
    })
    // new webpackHotModuleReplacementPlugin() // HMR
    // new webpackNamedModulesPlugin() // HMR
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
  config.plugins.push(
    new HtmlWebpackPlugin({
      filename: `${templateFileBaseName}.html`, // can specify a subdirectory here too
      template: item,
      cache: false,
      hash: !isProduction,
      inject: false,
      minify: {
        removeComments: true
      },
      showErrors: false,
      isProduction,
      renderBlock: renderBlockEngine,
      getLocalData: () => localDataEngine(templateFileBaseName),
      getGlobalData: globalDataEngine
    })
  );
});

if (isProduction) {
  config.plugins.push(new webpackUglifyJsPlugin({
    mangle: {
      screw_ie8: true,
      props: false,
      except: ['$super', '$', 'exports', 'require']
    },
    compress: {
      screw_ie8: true,
      warnings: false
    }
  }));
  config.plugins.push(
    new CleanWebpackPlugin(
      ['dist/'],
      {
        root: basePath,
        verbose: true,
        dry: false,
        watch: false
      }
    )
  );
  config.plugins.push(new BeautifyHtmlPlugin({ ocd: true }));
}

module.exports = config;
