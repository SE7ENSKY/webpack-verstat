require('console-stamp')(console, {
	pattern: 'HH:MM:ss',
	label: false
});

const { join } = require('path');
const { sync } = require('glob');
// const MemoryFileSystem = require('memory-fs');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const browserSync = require('browser-sync').create();
const webpackDevConfig = require('../config/webpack.dev.config');
const {
	projectRoot,
	boldTerminalString,
	addBlockToTemplateBranch,
	changeFileTimestamp,
	shortenAbsolutePath,
	getTemplateBranch,
	renderTemplate,
	compileTemplate
} = require('./utils');


const devServerConfig = {
	contentBase: join(projectRoot, 'dist'),
	publicPath: '/',
	watchOptions: {
		ignored: /node_modules/
		// aggregateTimeout: 300, // watching files
		// poll: 1000 // watching files
	},
	// historyApiFallback: {
	// 	disableDotRule: true
	// },
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

// const memoryFS = new MemoryFileSystem();
const compiler = webpack(webpackDevConfig);
// compiler.outputFileSystem = memoryFS;
const webpackDevMiddlewareInstance = webpackDevMiddleware(compiler, devServerConfig);
const webpackHotMiddlewareInstance = webpackHotMiddleware(compiler);
// webpackDevMiddlewareInstance.waitUntilValid(() => {
// 	console.log(
// 		'DATA:',
// 		compiler.outputFileSystem.readdirSync(`${webpackDevConfig.output.path}/assets/img/`)
// 	);
// });

browserSync.init({
	ui: false,
	open: false,
	notify: false,
	reloadOnRestart: true,
	watchOptions: {
		ignoreInitial: true,
		awaitWriteFinish: true
	},
	port: devServerConfig.port,
	server: {
		baseDir: join(projectRoot, 'dist'),
		// serveStaticOptions: {
		// 	extensions: ['html']
		// },
		middleware: [
			webpackDevMiddlewareInstance,
			webpackHotMiddlewareInstance
		]
	},
	files: [
		{
			match: `${projectRoot}/src/data/*.yml`,
			fn: handleGlobalData
		},
		{
			match: `${projectRoot}/src/*.?(pug|jade)`,
			fn: handleTemplateWithData
		},
		{
			match: `${projectRoot}/src/layouts/*.?(pug|jade)`,
			fn: handleTemplate
		},
		{
			match: `${projectRoot}/src/blocks/**/*.?(pug|jade)`,
			fn: handleBlock
		}
	]
});

function handleChanges(templateWithData, template, block) {
	if (!templateWithData && !template && !block) {
		const branch = sync(`${projectRoot}/src/*.?(pug|jade)`);
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
		changeFileTimestamp(1, join(projectRoot, 'bin', 'dev.server.js'));
	} else if (event === 'unlink') {
		console.log(boldTerminalString('unlink:'), shortenAbsolutePath(file));
		changeFileTimestamp(1, join(projectRoot, 'bin', 'dev.server.js'));
	}
}

function handleTemplateWithData(event, file) {
	if (event === 'change') {
		console.log(boldTerminalString('change:'), shortenAbsolutePath(file));
		handleChanges(file, null, null);
		webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
	} else if (event === 'add') {
		console.log(boldTerminalString('add:'), shortenAbsolutePath(file));
		changeFileTimestamp(1, join(projectRoot, 'bin', 'dev.server.js'));
	} else if (event === 'unlink') {
		console.log(boldTerminalString('unlink:'), shortenAbsolutePath(file));
		changeFileTimestamp(1, join(projectRoot, 'bin', 'dev.server.js'));
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
