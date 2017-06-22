require('console-stamp')(console, {
	pattern: 'HH:MM:ss',
	label: false
});

const pathResolve = require('path').resolve;
const pathJoin = require('path').join;
const webpack = require('webpack');
const webpackDevServer = require('webpack-dev-server');
const webpackDevConfig = require('../config/webpack.dev.config');
const projectRoot = pathResolve(__dirname, '../');


const devServerConfig = {
	contentBase: pathJoin(projectRoot, 'dist'),
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
