require('console-stamp')(console, {
	pattern: 'HH:MM:ss',
	label: false
});

const path = require('path');
const MemoryFileSystem = require('memory-fs');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const browserSync = require('browser-sync').create();
const webpackDevConfig = require('../configs/webpack.dev.config');
const chokidarWatchConfig = require('../configs/chokidar.watch.config');
const consoleOutputConfig = require('../configs/console.output.config');
const {
	PROJECT_ROOT,
	TEMPLATES_NO_GRID,
	PROD_OUTPUT_DIRECTORY,
	boldString,
	addBlockToTemplateBranch,
	changeFileTimestamp,
	shortenPath,
	getTemplateBranches,
	getGlobalData,
	renderTemplate,
	compileTemplate,
	addHtmlWebpackPlugins
} = require('./core');

const port = 8080;
const uiPort = 8081;
const devServerConfig = {
	contentBase: PROD_OUTPUT_DIRECTORY,
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
	port,
	stats: consoleOutputConfig
};

// fix for '[nodemon] app crashed' and pug exceptions
process.on('uncaughtException', err => console.log(`Caught exception: ${err}`));

const memoryFS = new MemoryFileSystem();
const compiler = webpack(webpackDevConfig);
compiler.outputFileSystem = memoryFS;
compiler.apply(
	...addHtmlWebpackPlugins(
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
	reloadDebounce: 100,
	watchOptions: chokidarWatchConfig,
	port: devServerConfig.port,
	server: {
		baseDir: PROD_OUTPUT_DIRECTORY,
		middleware: [
			webpackDevMiddlewareInstance,
			webpackHotMiddlewareInstance
		]
	},
	files: [
		{
			match: `${PROJECT_ROOT}/src/data/*.(yml|yaml)`,
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
		},
		{
			match: `${PROJECT_ROOT}/src/blocks/**/*.coffee`,
			fn: handleCoffeeScript
		}
	]
});

function handleChanges(templateWithData, template, block, data) {
	const templateBasename = template ? path.basename(template, path.extname(template)) : template;
	if ((!templateWithData && !block) && (!template || templateBasename === 'root' || templateBasename === 'main')) {
		const templatesNoGridSize = TEMPLATES_NO_GRID.length;
		if (templatesNoGridSize) {
			const globalData = data ? getGlobalData(data) : data;
			console.log(boldString('recompiling all branches...'));
			for (let i = 0; i < templatesNoGridSize; i++) {
				renderTemplate(compileTemplate(TEMPLATES_NO_GRID[i], globalData));
			}
		}
	} else {
		const templateBranches = getTemplateBranches(templateWithData, template, block);
		for (let i = 0, templateBranchesSize = templateBranches.length; i < templateBranchesSize; i++) {
			const templateBranch = templateBranches[i];
			console.log(boldString('recompile branch:'), shortenPath(templateBranch));
			renderTemplate(compileTemplate(templateBranch));
		}
	}
}

function handleGlobalData(event, file) {
	switch (event) {
		case 'change':
			console.log(boldString(`${event}:`), shortenPath(file));
			handleChanges(null, null, null, file);
			webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
			break;
		case 'add':
		case 'unlink':
			console.log(boldString(`${event}:`), shortenPath(file));
			changeFileTimestamp(1, path.join(PROJECT_ROOT, 'bin', 'dev.server.js'));
			break;
	}
}

function handleTemplateWithData(event, file) {
	switch (event) {
		case 'change':
			console.log(boldString(`${event}:`), shortenPath(file));
			handleChanges(file.replace(/\\/g, '/'), null, null);
			webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
			break;
		case 'add':
		case 'unlink':
			console.log(boldString(`${event}:`), shortenPath(file));
			changeFileTimestamp(1, path.join(PROJECT_ROOT, 'bin', 'dev.server.js'));
			break;
	}
}

function handleTemplate(event, file) {
	switch (event) {
		case 'change':
			console.log(boldString(`${event}:`), shortenPath(file));
			handleChanges(null, file.replace(/\\/g, '/'), null);
			webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
			break;
		case 'add':
		case 'unlink':
			console.log(boldString(`${event}:`), shortenPath(file));
			if (getTemplateBranches(null, file.replace(/\\/g, '/'), null).length) {
				changeFileTimestamp(1, path.join(PROJECT_ROOT, 'bin', 'dev.server.js'));
			} else {
				handleChanges(null, file.replace(/\\/g, '/'), null);
				webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
			}
	}
}

function handleBlock(event, file) {
	switch (event) {
		case 'add':
			console.log(boldString(`${event}:`), shortenPath(file));
			addBlockToTemplateBranch(file.replace(/\\/g, '/'));
			handleChanges(null, null, file.replace(/\\/g, '/'));
			webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
			break;
		case 'change':
		case 'unlink':
			console.log(boldString(`${event}:`), shortenPath(file));
			handleChanges(null, null, file.replace(/\\/g, '/'));
			webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
			break;
	}
}

function handleCoffeeScript(event, file) {
	if (event === 'change') {
		webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
	}
}
