const chokidarWatch = require('chokidar').watch;
const pathResolve = require('path').resolve;
const webpack = require('webpack');
const browserSync = require('browser-sync');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const webpackConfig = require('../config/webpack.dev.config');


const basePath = pathResolve(__dirname, '../');
const devServerConfig = {
  contentBase: `${basePath}/dist`,
  // watchContentBase: true,
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

const watchFiles = [
  `${basePath}/src/components/**/*.?(pug|jade)`,
  `${basePath}/src/data/global/*.?(json|yml)`,
  `${basePath}/src/data/local/*.?(json|yml)`,
  `${basePath}/config/webpack.dev.config.js`
];

// FIXME chokidar add
const webpackDevMiddlewareInstance = webpackDevMiddleware(compiler, devServerConfig);
const handleFiles = () => webpackDevMiddlewareInstance.invalidate();
chokidarWatch(watchFiles).on('add', handleFiles).on('change', handleFiles).on('unlink', handleFiles);

browserSync({
  server: {
    baseDir: `${basePath}/dist`,
    middleware: [
      webpackDevMiddlewareInstance,
      webpackHotMiddleware(compiler)
    ]
  },
  files: ['dist/*.html']
});
