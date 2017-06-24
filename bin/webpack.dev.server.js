require('console-stamp')(console, {
	pattern: 'HH:MM:ss',
	label: false
});

const pathJoin = require('path').join;
const nodemon = require('nodemon');
const chokidarWatch = require('chokidar').watch;
const webpack = require('webpack');
const webpackDevServer = require('webpack-dev-server');
const webpackDevConfig = require('../config/webpack.dev.config');
const configUtils = require('../config/webpack.config.utils');


const devServerConfig = {
	contentBase: pathJoin(configUtils.projectRoot, 'dist'),
	publicPath: webpackDevConfig.output.publicPath,
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

const compiler = webpack(webpackDevConfig);
const server = new webpackDevServer(compiler, devServerConfig);
server.listen(devServerConfig.port);

const handleEntriesFolder = () => nodemon.emit('restart');
chokidarWatch(`${configUtils.projectRoot}/src/entries/*.js`)
	.on('add', handleEntriesFolder)
	.on('unlink', handleEntriesFolder);
