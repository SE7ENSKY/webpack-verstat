const fsReadFileSync = require('fs').readFileSync;
const pathResolve = require('path').resolve;
const pathExtname = require('path').extname;
const pathBasename = require('path').basename;
const pathJoin = require('path').join;
const globSync = require('glob').sync;
const pugCompile = require('pug').compile;
const pugCompileFile = require('pug').compileFile;
const yamlFrontLoadFront = require('yaml-front-matter').loadFront;
const yamlParse = require('yamljs').parse;
const basePath = pathResolve(__dirname, '../');
const nib = require('nib');
const autoprefixer = require('autoprefixer');
const bemto = require('verstat-bemto');
const webpackNoEmitOnErrorsPlugin = require('webpack').NoEmitOnErrorsPlugin;
const webpackProvidePlugin = require('webpack').ProvidePlugin;
const webpackLoaderOptionsPlugin = require('webpack').LoaderOptionsPlugin;
const webpackWatchIgnorePlugin = require('webpack').WatchIgnorePlugin;
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');


const layouts = globSync(`${basePath}/src/layouts/!(main|root).?(pug|jade)`);
const layoutsData = globSync(`${basePath}/src/*.?(pug|jade)`);
const globalLayoutsData = globSync(`${basePath}/src/data/*.?(yml|json)`);
const blocks = globSync(`${basePath}/src/blocks/**/*.?(pug|jade)`);

const readFile = fileName => fsReadFileSync(fileName, { encoding: 'utf8' });
const compileBlock = (mod, block) => {
  const index = blocks.findIndex(item => item.indexOf(block) !== -1);
  if (index !== -1) return pugCompile(`${mod}\n${readFile(blocks[index])}`);
};
const renderBlockEngine = (blockName, data) => {
  data.renderBlock = (blockName, data) => compileBlock(bemto, blockName)(data);
  return compileBlock(bemto, blockName)(data);
};
const getGlobalLayoutsData = () => {
  const data = globalLayoutsData.map((file) => {
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
  return data.length ? Object.assign({}, ...data) : {};
};

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
            presets: [['latest', { 'es2015': { 'modules': false } }]]
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
          // import: ['~verstat-nib/index.styl']
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

layoutsData.forEach((layoutData) => {
  const extractedData = yamlFrontLoadFront(layoutData, '\/\/---', 'content');
  const modifiedExtractedData = Object.assign({}, extractedData);
  delete modifiedExtractedData.layout;
  delete modifiedExtractedData.content;
  const template = layouts.filter(layout => layout.indexOf(extractedData.layout) !== -1);
  if (template.length) {
    const fn = pugCompileFile(template[0]);
    const initialLocals = {
      renderBlock: renderBlockEngine,
      file: modifiedExtractedData,
      content: (function () {
        const fn = pugCompile(`${bemto}\n${extractedData.content}`);
        const initialLocals = { renderBlock: renderBlockEngine };
        const locals = Object.assign(initialLocals, modifiedExtractedData, getGlobalLayoutsData());
        return fn(locals);
      })()
    };
    const locals = Object.assign(initialLocals, getGlobalLayoutsData());
    console.log('FILENAME:', `${pathBasename(layoutData).replace(/\.[^/.]+$/, '')}.html`);
    console.log('TEMPLATECONTENT:', fn(locals));
    baseConfig.plugins.push(
      new HtmlWebpackPlugin({
        filename: `${pathBasename(layoutData).replace(/\.[^/.]+$/, '')}.html`,
        templateContent: fn(locals),
        cache: false,
        hash: false,
        inject: 'body',
        minify: {
          removeComments: true
        }
      })
    );
  }
});

module.exports = baseConfig;
