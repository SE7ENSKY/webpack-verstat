// TODO gsap і immutable
// TODO видалити pretty після npm-релізу
// TODO зробить розумний svgo ?
// TODO перевести на webpack-blocks
// TODO <link rel="preload"> і загальна оптимізація
// TODO modernizrrc
// TODO CSS Modules ?
// TODO purifycss-webpack ?
// TODO prepack-webpack-plugin ?
// TODO допилить development server і hmr

const webpack = require('webpack');
const path = require('path');
const glob = require('glob');
const fs = require('fs');
const pug = require('pug');
const YAML = require('yamljs');
const autoprefixer = require('autoprefixer');
const bemto = require('../src/vendor/bemto/bemto.js');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const BeautifyHtmlPlugin = require('../custom-plugins/beautify-html-plugin/index');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

const readFile = fileName => fs.readFileSync(fileName, { encoding: 'utf8' });
const basePath = path.resolve(__dirname, '../');
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

const config = {
  context: `${basePath}/src`,
  entry: ['./main.js'],
  output: {
    path: `${basePath}/dist`,
    publicPath: '/assets/',
    // publicPath: '/', // HMR
    filename: isProduction ? 'assets/main.min.js' : 'assets/[name].min.[hash].js'
  },
  devtool: isProduction ? 'cheap-module-source-map' : 'source-map',
  devServer: developmentServerConfig,
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
            presets: [['es2015', { loose: true, modules: false }]]
          }
        }
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': process.env.NODE_ENV ? process.env.NODE_ENV : 'production'
      }
    }),
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery'
    }),
    new CopyWebpackPlugin([{ from: `${basePath}/src/assets/**/*` }]),
    new webpack.LoaderOptionsPlugin({
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
    new webpack.WatchIgnorePlugin([path.join(__dirname, 'node_modules')]),
    new ExtractTextPlugin({
      filename: 'assets/[name].min.css',
      disable: !isProduction,
      allChunks: true
    })
    // new webpack.HotModuleReplacementPlugin() // HMR
    // new webpack.NamedModulesPlugin() // HMR
    // new webpack.optimize.CommonsChunkPlugin({
    //   name: 'vendor',
    //   children: true,
    //   minChunks: 2,
    //   async: true
    // })
  ]
};

glob.sync(`${basePath}/src/layouts/!(main|root).?(pug|jade)`).forEach((item) => {
  const templateFileBaseName = path.basename(item, path.extname(item)).replace('frontPage', 'index');
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
      }
    })
  );
});

if (isProduction) {
  config.plugins.push(new webpack.optimize.UglifyJsPlugin({
    mangle: {
      screw_ie8: true
    },
    compress: {
      screw_ie8: true,
      unused: true,
      dead_code: true,
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
