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
		ignored: /node_modules/
	},
	compress: false,
	hot: true,
	lazy: false,
	inline: true,
	https: false,
	host: 'localhost',
	port: 8080,
	stats: {
		colors: true
	}
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

// TODO refactor callbacks

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
	if (event === 'change') {
		console.log(boldTerminalString('change:'), shortenAbsolutePath(file));
		handleChanges();
		webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
	} else if (event === 'add') {
		console.log(boldTerminalString('add:'), shortenAbsolutePath(file));
		changeFileTimestamp(1, join(PROJECT_ROOT, 'bin', 'dev.server.js'));
	} else if (event === 'unlink') {
		console.log(boldTerminalString('unlink:'), shortenAbsolutePath(file));
		changeFileTimestamp(1, join(PROJECT_ROOT, 'bin', 'dev.server.js'));
	}
}

function handleTemplateWithData(event, file) {
	if (event === 'change') {
		console.log(boldTerminalString('change:'), shortenAbsolutePath(file));
		handleChanges(file, null, null);
		webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
	} else if (event === 'add') {
		console.log(boldTerminalString('add:'), shortenAbsolutePath(file));
		changeFileTimestamp(1, join(PROJECT_ROOT, 'bin', 'dev.server.js'));
	} else if (event === 'unlink') {
		console.log(boldTerminalString('unlink:'), shortenAbsolutePath(file));
		changeFileTimestamp(1, join(PROJECT_ROOT, 'bin', 'dev.server.js'));
	}
}

function handleTemplate(event, file) {
	if (event === 'change') {
		console.log(boldTerminalString('change:'), shortenAbsolutePath(file));
		handleChanges(null, file, null);
		webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
	} else if (event === 'add') {
		console.log(boldTerminalString('add:'), shortenAbsolutePath(file));
		handleChanges(null, file, null);
		webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
	} else if (event === 'unlink') {
		console.log(boldTerminalString('unlink:'), shortenAbsolutePath(file));
		handleChanges(null, file, null);
		webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
	}
}

function handleBlock(event, file) {
	if (event === 'change') {
		console.log(boldTerminalString('change:'), shortenAbsolutePath(file));
		handleChanges(null, null, file);
		webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
	} else if (event === 'add') {
		console.log(boldTerminalString('add:'), shortenAbsolutePath(file));
		addBlockToTemplateBranch(file);
		handleChanges(null, null, file);
		webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
	} else if (event === 'unlink') {
		console.log(boldTerminalString('unlink:'), shortenAbsolutePath(file));
		handleChanges(null, null, file);
		webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
	}
}
