require('console-stamp')(console, {
	pattern: 'HH:MM:ss',
	label: false
});

const { join } = require('path');
const { watch } = require('chokidar');
const { sync } = require('glob');
const webpack = require('webpack');
const webpackDevServer = require('webpack-dev-server');
const webpackDevConfig = require('../config/webpack.dev.config');
const {
	projectRoot,
	templateDependencies,
	boldTerminalString,
	changeFileTimestamp,
	shortenAbsolutePath,
	getTemplateBranch,
	renderTemplate,
	compileTemplate
} = require('../config/webpack.config.utils');


const chokidarConfig = {
	paths: {
		globalData: `${projectRoot}/src/data/*.yml`,
		layoutsData: `${projectRoot}/src/*.?(pug|jade)`,
		layouts: `${projectRoot}/src/layouts/*.?(pug|jade)`,
		blocks: `${projectRoot}/src/blocks/**/*.?(pug|jade)`
	},
	options: {
		ignoreInitial: true,
		awaitWriteFinish: true
	}
};

// TODO remove webpack-dev-server
// TODO install: webpack-dev-middleware, webpack-hot-middleware, browser-sync
const server = startDevServer(webpackDevConfig);
server.listen(webpackDevConfig.devServer.port);

function startDevServer(config) {
	console.log(
		boldTerminalString('listening:'),
		`${config.devServer.https ? 'https' : 'http'}://${config.devServer.host}:${config.devServer.port}/`
	);
	const compiler = webpack(config);
	return new webpackDevServer(compiler, config.devServer);
}

function restartDevServer(config) {
	console.log(
		boldTerminalString('closing:'),
		`${config.devServer.https ? 'https' : 'http'}://${config.devServer.host}:${config.devServer.port}/`
	);
	changeFileTimestamp(1, join(projectRoot, 'bin', 'webpack.dev.server.js'));
}

// ONLY FOR TESTING!
function testTemplateDependencies() {
	for (const [key, value] of templateDependencies) {
		const { file, layout, blocks } = value;
		console.log('/--------------------------------/');
		console.log('key:', key);
		console.log('file:', file);
		console.log('layout:', layout);
		console.log('blocks:', blocks);
		console.log('/--------------------------------/');
	}
}

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

watch(chokidarConfig.paths.globalData, chokidarConfig.options)
	.on('change', function (path) {
		console.log(boldTerminalString('change:'), shortenAbsolutePath(path));
		handleChanges();
		testTemplateDependencies();
	})
	.on('add', function (path) {
		console.log(boldTerminalString('add:'), shortenAbsolutePath(path));
		restartDevServer();
		testTemplateDependencies();
	})
	.on('unlink', function (path) {
		console.log(boldTerminalString('unlink:'), shortenAbsolutePath(path));
		restartDevServer();
		testTemplateDependencies();
	});

watch(chokidarConfig.paths.layoutsData, chokidarConfig.options)
	.on('change', function (path) {
		console.log(boldTerminalString('change:'), shortenAbsolutePath(path));
		handleChanges(path, null, null);
		testTemplateDependencies();
	})
	.on('add', function (path) {
		console.log(boldTerminalString('add:'), shortenAbsolutePath(path));
		restartDevServer(webpackDevConfig);
		testTemplateDependencies();
	})
	.on('unlink', function (path) {
		console.log(boldTerminalString('unlink:'), shortenAbsolutePath(path));
		restartDevServer(webpackDevConfig);
		testTemplateDependencies();
	});

watch(chokidarConfig.paths.layouts, chokidarConfig.options)
	.on('change', function (path) {
		console.log(boldTerminalString('change:'), shortenAbsolutePath(path));
		handleChanges(null, path, null);
		testTemplateDependencies();
	})
	.on('add', function (path) {
		console.log(boldTerminalString('add:'), shortenAbsolutePath(path));
		handleChanges(null, path, null);
		testTemplateDependencies();
	})
	.on('unlink', function (path) {
		console.log(boldTerminalString('unlink:'), shortenAbsolutePath(path));
		handleChanges(null, path, null);
		testTemplateDependencies();
	});

watch(chokidarConfig.paths.blocks, chokidarConfig.options)
	.on('change', function (path) {
		console.log(boldTerminalString('change:'), shortenAbsolutePath(path));
		handleChanges(null, null, path);
		testTemplateDependencies();
	})
	.on('add', function (path) {
		console.log(boldTerminalString('add:'), shortenAbsolutePath(path));
		handleChanges(null, null, path);
		testTemplateDependencies();
	})
	.on('unlink', function (path) {
		console.log(boldTerminalString('unlink:'), shortenAbsolutePath(path));
		handleChanges(null, null, path);
		testTemplateDependencies();
	});
