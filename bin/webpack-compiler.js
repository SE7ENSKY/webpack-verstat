const chokidarWatch = require('chokidar').watch;
const pathResolve = require('path').resolve;
const webpack = require('webpack');
const webpackDevServer = require('webpack-dev-server');
let webpackConfig = require('../config/webpack.config');

const basePath = pathResolve(__dirname, '../');
const PORT = webpackConfig.devServer.port;
const watchFiles = [
  `${basePath}/src/components/**/*.?(pug|jade)`,
  `${basePath}/src/data/global/*.?(json|yml)`,
  `${basePath}/src/data/local/*.?(json|yml)`,
  `${basePath}/config/webpack.config.js`
];
const startDevServer = (config, port) => {
  // config.entry.unshift(`webpack-dev-server/client?http://localhost:${PORT}`, 'webpack/hot/dev-server');
  config.entry.unshift(`webpack-dev-server/client?http://localhost:${PORT}`);
  const compiler = webpack(config);
  return new webpackDevServer(compiler, config.devServer);
};
let server = startDevServer(webpackConfig);
server.listen(PORT);
const handleFiles = () => {
  // console.log('Configuration changed, restarting development server');
  server.close();
  // bust config from cache so we get fresh configuration to load
  delete require.cache[require.resolve('../config/webpack.config')];
  webpackConfig = require('../config/webpack.config');
  server = startDevServer(webpackConfig);
  server.listen(PORT);
};

chokidarWatch(watchFiles)
  .on('add', handleFiles)
  .on('change', handleFiles)
  .on('unlink', handleFiles);
