require('console-stamp')(console, {
	pattern: 'HH:MM:ss',
	label: false
});

// const nodemon = require('nodemon');
// const chokidarWatch = require('chokidar').watch;
const webpack = require('webpack');
const webpackProdConfig = require('../config/webpack.prod.config');
const configUtils = require('../config/webpack.config.utils');


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

// const handleEntriesFolder = () => nodemon.emit('restart');
// chokidarWatch(`${configUtils.projectRoot}/src/entries/*.js`)
// 	.on('add', handleEntriesFolder)
// 	.on('unlink', handleEntriesFolder);
