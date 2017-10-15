require('console-stamp')(console, {
	pattern: 'HH:MM:ss',
	label: false
});

const webpack = require('webpack');
const webpackProdConfig = require('../config/webpack.prod.config');
const browserSync = require('browser-sync').create();
const {
	CONSOLE_OUTPUT,
	CHOKIDAR_WATCH_OPTIONS
} = require('./utils');

const port = 3000;
const browserSyncConfig = {
	ui: false,
	open: false,
	notify: false,
	reloadOnRestart: true,
	watchOptions: CHOKIDAR_WATCH_OPTIONS,
	host: 'localhost',
	port,
	server: {
		baseDir: webpackProdConfig.output.path
	}
};

const compiler = webpack(webpackProdConfig);
compiler.plugin('done', (stats) => browserSync.init(browserSyncConfig));
compiler.run((err, stats) => console.log(stats.toString(CONSOLE_OUTPUT)));
