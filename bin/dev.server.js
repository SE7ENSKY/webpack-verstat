require('console-stamp')(console, {
	pattern: 'HH:MM:ss',
	label: false
});

const {
	join,
	basename,
	extname
} = require('path');
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

const port = 8080;
const uiPort = 8081;
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
	port,
	stats: CONSOLE_OUTPUT
};

// fix for '[nodemon] app crashed'
process.on('uncaughtException', err => console.log(`Caught exception: ${err}`));

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
	ui: {
		port: uiPort
	},
	open: false,
	notify: false,
	reloadOnRestart: true,
	reloadDebounce: 300,
	watchOptions: {
		ignoreInitial: true,
		awaitWriteFinish: true,
		usePolling: true,
		interval: 100,
		binaryInterval: 300
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
	const templateBasename = template ? basename(template, extname(template)) : template;
	if ((!templateWithData && !block) && (!template || templateBasename === 'root' || templateBasename === 'main')) {
		const branch = sync(`${PROJECT_ROOT}/src/!(sitegrid).?(pug|jade)`);
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
	case 'unlink':
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
	case 'unlink':
		console.log(boldTerminalString(`${event}:`), shortenAbsolutePath(file));
		changeFileTimestamp(1, join(PROJECT_ROOT, 'bin', 'dev.server.js'));
		break;
	}
}

function handleTemplate(event, file) {
	switch (event) {
	case 'change':
		console.log(boldTerminalString(`${event}:`), shortenAbsolutePath(file));
		handleChanges(null, file, null);
		webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
		break;
	case 'add':
	case 'unlink':
		console.log(boldTerminalString(`${event}:`), shortenAbsolutePath(file));
		if (getTemplateBranch(null, file, null).length) {
			changeFileTimestamp(1, join(PROJECT_ROOT, 'bin', 'dev.server.js'));
		} else {
			handleChanges(null, file, null);
			webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
		}
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
	case 'unlink':
		console.log(boldTerminalString(`${event}:`), shortenAbsolutePath(file));
		handleChanges(null, null, file);
		webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
		break;
	}
}
