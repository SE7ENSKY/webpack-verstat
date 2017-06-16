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
const HappyPack = require('happypack');

const readFile = fileName => fsReadFileSync(fileName, { encoding: 'utf8' });
const basePath = pathResolve(__dirname, '../');
const happyThreadPool = HappyPack.ThreadPool({ size: 4 });
const isProduction = process.env.NODE_ENV === 'production';

const cssDevelopmentLoaders = ['style-loader', 'css-loader', 'postcss-loader'];
const sassDevelopmentLoaders = [...cssDevelopmentLoaders, 'sass-loader'];
const lessDevelopmentLoaders = [...cssDevelopmentLoaders, 'less-loader'];
const stylusDevelopmentLoaders = [...cssDevelopmentLoaders.filter(value => value !== 'postcss-loader'), 'stylus-loader'];
const cssProductionLoader = {
  loader: 'css-loader',
  options: {
    minimize: {
      discardComments: {
        removeAll: true
      },
      discardDuplicates: true
    }
  }
};

const generateStyleLoaders = (env, prodLoaders, prodFallbackLoaders, devLoaders) => {
  if (env) {
    return ExtractTextPlugin.extract({
      use: prodLoaders,
      fallback: prodFallbackLoaders
    });
  }
  return devLoaders;
};

const createHappyPlugin = (id, loaders) => {
  return new HappyPack({
    id,
    tempDir: `${basePath}/bin/.happypack/`,
    threadPool: happyThreadPool,
    verbose: false,
    loaders
  });
};

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
  devtool: isProduction ? 'source-map' : 'cheap-module-source-map',
  devServer: {
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
  },
  // externals: {}, // ?
  module: {
    rules: [
      {
        test: /\.txt$/,
        use: 'happypack/loader?id=txt'
      },
      {
        test: /\.yaml$/,
        use: 'happypack/loader?id=yaml'
      },
      {
        test: /\.json$/,
        use: 'happypack/loader?id=json'
      },
      {
        test: /\.css$/,
        use: generateStyleLoaders(
          isProduction,
          'happypack/loader?id=css-production',
          'happypack/loader?id=css-production-fallback',
          'happypack/loader?id=css-development'
        )
      },
      {
        test: /\.(sass|scss)$/,
        use: generateStyleLoaders(
          isProduction,
          'happypack/loader?id=sass-production',
          'happypack/loader?id=sass-production-fallback',
          'happypack/loader?id=sass-development'
        )
      },
      {
        test: /\.less$/,
        use: generateStyleLoaders(
          isProduction,
          'happypack/loader?id=less-production',
          'happypack/loader?id=less-production-fallback',
          'happypack/loader?id=less-development'
        )
      },
      {
        test: /\.styl$/,
        use: generateStyleLoaders(
          isProduction,
          'happypack/loader?id=stylus-production',
          'happypack/loader?id=stylus-production-fallback',
          'happypack/loader?id=stylus-development'
        )
      },
      {
        test: /\.html$/,
        use: 'happypack/loader?id=html'
      },
      {
        test: /\.(pug|jade)$/,
        use: 'happypack/loader?id=pug'
      },
      {
        test: /\.coffee$/,
        use: 'happypack/loader?id=coffee'
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'happypack/loader?id=js'
      }
    ]
  },
  plugins: [
    new webpackDefinePlugin({
      'process.env': {
        'NODE_ENV': process.env.NODE_ENV ? 'production' : 'development'
      }
    }),
    createHappyPlugin('txt', ['raw-loader']),
    createHappyPlugin('yaml', ['yaml-loader']),
    createHappyPlugin('json', ['json-loader']),
    createHappyPlugin('pug', ['pug-loader']),
    createHappyPlugin(
      'html',
      [{
        loader: 'html-loader',
        options: {
          minimize: false
        }
      }]
    ),
    createHappyPlugin('coffee', ['coffee-loader']),
    createHappyPlugin(
      'js',
      [{
        loader: 'babel-loader',
        options: {
          cacheDirectory: true,
          babelrc: false,
          plugins: ['transform-runtime'],
          presets: [['es2015', { modules: false }]]
        }
      }]
    ),
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

globSync(`${basePath}/src/layouts/!(main|root).?(pug|jade)`).forEach((item) => {
  const templateFileBaseName = pathBasename(item, pathExtname(item)).replace('frontPage', 'index');
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
      ['dist'],
      {
        root: basePath,
        verbose: true,
        dry: false,
        watch: false
      }
    )
  );
  config.plugins.push(new BeautifyHtmlPlugin({ ocd: true }));
  config.plugins.push(createHappyPlugin('css-production', [cssProductionLoader, 'postcss-loader']));
  config.plugins.push(createHappyPlugin('css-production-fallback', ['style-loader', 'postcss-loader']));
  config.plugins.push(createHappyPlugin('sass-production', [cssProductionLoader, 'postcss-loader', 'sass-loader']));
  config.plugins.push(createHappyPlugin('sass-production-fallback', ['style-loader', 'postcss-loader', 'sass-loader']));
  config.plugins.push(createHappyPlugin('less-production', [cssProductionLoader, 'postcss-loader', 'less-loader']));
  config.plugins.push(createHappyPlugin('less-production-fallback', ['style-loader', 'postcss-loader', 'less-loader']));
  config.plugins.push(createHappyPlugin('stylus-production', [cssProductionLoader, 'stylus-loader']));
  config.plugins.push(createHappyPlugin('stylus-production-fallback', ['style-loader', 'stylus-loader']));
} else {
  config.plugins.push(createHappyPlugin('css-development', cssDevelopmentLoaders));
  config.plugins.push(createHappyPlugin('sass-development', sassDevelopmentLoaders));
  config.plugins.push(createHappyPlugin('sass-development', sassDevelopmentLoaders));
  config.plugins.push(createHappyPlugin('less-development', lessDevelopmentLoaders));
  config.plugins.push(createHappyPlugin('stylus-development', stylusDevelopmentLoaders));
}

module.exports = config;
