require('console-stamp')(console, {
	pattern: 'HH:MM:ss',
	label: false
});

const { join } = require('path');
const { sync } = require('glob');
const MemoryFileSystem = require('memory-fs');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const browserSync = require('browser-sync').create();
const webpackDevConfig = require('../config/webpack.dev.config');
const {
	PROJECT_ROOT,
	CONSOLE_OUTPUT,
	PROD_OUTPUT,
	boldTerminalString,
	addBlockToTemplateBranch,
	changeFileTimestamp,
	shortenAbsolutePath,
	getTemplateBranch,
	renderTemplate,
	compileTemplate,
	initHtmlWebpackPlugin
} = require('./utils');


const devServerConfig = {
	contentBase: PROD_OUTPUT,
	publicPath: webpackDevConfig.output.publicPath,
	watchOptions: {
		ignored: /node_modules/,
		aggregateTimeout: 300,
		poll: 1000
	},
	compress: false,
	hot: true,
	lazy: false,
	inline: true,
	https: false,
	host: 'localhost',
	port: 8080,
	stats: CONSOLE_OUTPUT
};

const memoryFS = new MemoryFileSystem();
const compiler = webpack(webpackDevConfig);
compiler.outputFileSystem = memoryFS;
compiler.apply(
	...initHtmlWebpackPlugin(
		webpackDevConfig.output.path,
		compiler.outputFileSystem,
		compiler,
		browserSync
	)
);
const webpackDevMiddlewareInstance = webpackDevMiddleware(compiler, devServerConfig);
const webpackHotMiddlewareInstance = webpackHotMiddleware(compiler);

browserSync.init({
	ui: false,
	open: false,
	notify: false,
	reloadOnRestart: true,
	reloadDebounce: 300,
	watchOptions: {
		ignoreInitial: true,
		awaitWriteFinish: true
	},
	port: devServerConfig.port,
	server: {
		baseDir: PROD_OUTPUT,
		middleware: [
			webpackDevMiddlewareInstance,
			webpackHotMiddlewareInstance
		]
	},
	files: [
		{
			match: `${PROJECT_ROOT}/src/data/*.yml`,
			fn: handleGlobalData
		},
		{
			match: `${PROJECT_ROOT}/src/*.?(pug|jade)`,
			fn: handleTemplateWithData
		},
		{
			match: `${PROJECT_ROOT}/src/layouts/*.?(pug|jade)`,
			fn: handleTemplate
		},
		{
			match: `${PROJECT_ROOT}/src/blocks/**/*.?(pug|jade)`,
			fn: handleBlock
		}
	]
});

function handleChanges(templateWithData, template, block) {
	if (!templateWithData && !template && !block) {
		const branch = sync(`${PROJECT_ROOT}/src/*.?(pug|jade)`);
		if (branch.length) {
			console.log(boldTerminalString('recompiling all branches...'));
			branch.forEach(item => renderTemplate(compileTemplate(item)));
		}
	} else {
		getTemplateBranch(templateWithData, template, block).forEach(function (item) {
			console.log(boldTerminalString('recompile branch:'), shortenAbsolutePath(item));
			renderTemplate(compileTemplate(item));
		});
	}
}

function handleGlobalData(event, file) {
	switch (event) {
	case 'change':
		console.log(boldTerminalString(`${event}:`), shortenAbsolutePath(file));
		handleChanges();
		webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
		break;
	case 'add':
	case 'unlink:':
		console.log(boldTerminalString(`${event}:`), shortenAbsolutePath(file));
		changeFileTimestamp(1, join(PROJECT_ROOT, 'bin', 'dev.server.js'));
		break;
	}
}

function handleTemplateWithData(event, file) {
	switch (event) {
	case 'change':
		console.log(boldTerminalString(`${event}:`), shortenAbsolutePath(file));
		handleChanges(file, null, null);
		webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
		break;
	case 'add':
	case 'unlink:':
		console.log(boldTerminalString(`${event}:`), shortenAbsolutePath(file));
		changeFileTimestamp(1, join(PROJECT_ROOT, 'bin', 'dev.server.js'));
		break;
	}
}

function handleTemplate(event, file) {
	switch (event) {
	case 'change':
	case 'add':
	case 'unlink:':
		console.log(boldTerminalString(`${event}:`), shortenAbsolutePath(file));
		handleChanges(null, file, null);
		webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
		break;
	}
}

function handleBlock(event, file) {
	switch (event) {
	case 'add':
		console.log(boldTerminalString(`${event}:`), shortenAbsolutePath(file));
		addBlockToTemplateBranch(file);
		handleChanges(null, null, file);
		webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
		break;
	case 'change':
	case 'unlink:':
		console.log(boldTerminalString(`${event}:`), shortenAbsolutePath(file));
		handleChanges(null, null, file);
		webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
		break;
	}
}
