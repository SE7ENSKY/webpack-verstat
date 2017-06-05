const pathResolve = require('path').resolve;
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const browserSync = require('browser-sync').create();
const webpackConfig = require('../config/webpack.dev.config');
const basePath = pathResolve(__dirname, '../');


const devServerConfig = {
  contentBase: `${basePath}/dist`,
  publicPath: webpackConfig.output.publicPath,
  watchOptions: {
    ignored: /node_modules/
  },
  historyApiFallback: {
    disableDotRule: true
  },
  compress: false,
  hot: true,
  lazy: false,
  inline: true,
  host: 'localhost',
  port: 8080,
  stats: {
    colors: true
  }
};

const compiler = webpack(webpackConfig);
const webpackDevMiddlewareInstance = webpackDevMiddleware(compiler, devServerConfig);

const handleFile = (event) => {
  if (event === 'add' || 'change' || 'unlink') {
    webpackDevMiddlewareInstance.invalidate();
    webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
  }
};

const handleLayout = (event) => {
  switch (event) {
    case 'add':
    case 'unlink':
      webpackDevMiddlewareInstance.invalidate();
      webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
      break;
    case 'change':
      webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
      break;
  }
};

browserSync.init({
  ui: false,
  open: false,
  notify: false,
  reloadOnRestart: true,
  watchOptions: {
    ignoreInitial: true
  },
  port: devServerConfig.port,
  server: {
    baseDir: `${basePath}/dist`,
    serveStaticOptions: {
      extensions: ['html']
    },
    middleware: [
      webpackDevMiddlewareInstance,
      webpackHotMiddleware(compiler)
    ]
  },
  files: [
    {
      match: [`${basePath}/src/layouts/*.?(pug|jade)`],
      fn: (event, file) => handleLayout(event)
    },
    {
      match: [`${basePath}/src/blocks/**/*.?(pug|jade)`],
      fn: (event, file) => handleFile(event)
    },
    {
      match: [`${basePath}/src/data/*.?(json|yml)`],
      fn: (event, file) => handleFile(event)
    },
    {
      match: [`${basePath}/config/webpack.*.js`],
      fn: (event, file) => handleFile(event)
    }
  ]
});
