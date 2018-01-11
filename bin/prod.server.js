require('console-stamp')(console, {
	pattern: 'HH:MM:ss',
	label: false
});

const webpack = require('webpack');
const webpackProdConfig = require('../configs/webpack.prod.config');
const consoleOutputConfig = require('../configs/console.output.config');
const chokidarWatchConfig = require('../configs/chokidar.watch.config');
const browserSync = require('browser-sync').create();
const {
	initTemplateEngine,
	addHtmlWebpackPlugins
} = require('./core');

const port = 3000;
const browserSyncConfig = {
	ui: false,
	open: false,
	notify: false,
	reloadOnRestart: true,
	watchOptions: chokidarWatchConfig,
	host: 'localhost',
	port,
	server: {
		baseDir: webpackProdConfig.output.path
	}
};

const compiler = webpack(webpackProdConfig);
initTemplateEngine(() => {
	compiler.apply(...addHtmlWebpackPlugins());
	compiler.plugin('done', (stats) => browserSync.init(browserSyncConfig));
	compiler.run((err, stats) => console.log(stats.toString(consoleOutputConfig)));
});
