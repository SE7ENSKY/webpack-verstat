const chokidar = require('chokidar');
const path = require('path');
const webpackDevServer = require('webpack-dev-server');
const webpack = require('webpack');
const webpackConfig = require('../config/webpack.config');


const basePath = path.resolve(__dirname, '../');
const PORT = 8080;
let server = startDevServer(require('../config/webpack.config'));
server.listen(PORT);

chokidar.watch(`${basePath}/src/components/text/text.pug`).on('change', () => {
  // console.log('Configuration changed, restarting development server');
  server.close();
  // bust config from cache so we get fresh configuration to load
  delete require.cache[require.resolve('../config/webpack.config')];
  server = startDevServer(require('../config/webpack.config'));
  server.listen(PORT);
});

function startDevServer(config, port) {
  // config.entry.unshift(`webpack-dev-server/client?http://localhost:${PORT}`, 'webpack/hot/dev-server');
  config.entry.unshift(`webpack-dev-server/client?http://localhost:${PORT}`);
  const compiler = webpack(config);
  return new webpackDevServer(compiler, config.devServer);
}
