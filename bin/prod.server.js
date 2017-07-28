require('console-stamp')(console, {
	pattern: 'HH:MM:ss',
	label: false
});

const webpack = require('webpack');
const webpackProdConfig = require('../config/webpack.prod.config');
const browserSync = require('browser-sync').create();


const browserSyncConfig = {
	ui: false,
	open: false,
	notify: false,
	reloadOnRestart: true,
	watchOptions: {
		ignoreInitial: true,
		awaitWriteFinish: true
	},
	host: 'localhost',
	port: 3000,
	server: {
		baseDir: webpackProdConfig.output.path
	}
};

const compiler = webpack(webpackProdConfig);
compiler.plugin('done', (stats) => browserSync.init(browserSyncConfig));
compiler.run(callback);

function callback(err, stats) {
	if (err) {
		console.error(err.stack || err);
		if (err.details) {
			console.error(err.details);
		}
		return;
	}
	const info = stats.toJson();
	if (stats.hasErrors()) {
		console.error(info.errors);
	}
	if (stats.hasWarnings()) {
		console.warn(info.warnings);
	}
	console.log(stats.toString('normal'));
}
