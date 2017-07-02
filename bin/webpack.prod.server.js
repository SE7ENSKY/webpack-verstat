require('console-stamp')(console, {
	pattern: 'HH:MM:ss',
	label: false
});

const webpack = require('webpack');
const webpackProdConfig = require('../config/webpack.prod.config');


webpack(webpackProdConfig, (err, stats) => {
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
});
