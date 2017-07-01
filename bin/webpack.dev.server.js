require('console-stamp')(console, {
	pattern: 'HH:MM:ss',
	label: false
});

const pathJoin = require('path').join;
const chokidarWatch = require('chokidar').watch;
const globSync = require('glob').sync;
const webpack = require('webpack');
const webpackDevServer = require('webpack-dev-server');
const webpackDevConfig = require('../config/webpack.dev.config');
const configUtils = require('../config/webpack.config.utils');

// TODO watch 'config' folder


const devServerConfig = {
	contentBase: pathJoin(configUtils.projectRoot, 'dist'),
	publicPath: webpackDevConfig.output.publicPath,
	watchOptions: {
		ignored: /node_modules/
	},
	historyApiFallback: {
		disableDotRule: true
	},
	compress: false,
	hot: true,
	lazy: false,
	inline: true,
	host: 'localhost',
	port: 8080,
	stats: {
		colors: true
	}
};

const chokidarConfig = {
	paths: {
		globalData: `${configUtils.projectRoot}/src/data/*.yml`,
		layoutsData: `${configUtils.projectRoot}/src/*.?(pug|jade)`,
		layouts: `${configUtils.projectRoot}/src/layouts/*.?(pug|jade)`,
		blocks: `${configUtils.projectRoot}/src/blocks/**/*.?(pug|jade)`
	},
	options: {
		ignoreInitial: true,
		awaitWriteFinish: true
	}
};

let server = startDevServer(require('../config/webpack.dev.config'), devServerConfig);
server.listen(devServerConfig.port);

function startDevServer(config, serverConfig) {
	const compiler = webpack(config);
	return new webpackDevServer(compiler, serverConfig);
}

function restartDevServer() {
	console.log(`restarting development server: ${devServerConfig.host}:${devServerConfig.port}`);
	server.close();
	delete require.cache[require.resolve('../config/webpack.dev.config')];
	server = startDevServer(require('../config/webpack.dev.config'), devServerConfig);
	server.listen(devServerConfig.port);
}

function handleChanges(templateWithData, template, block) {
	if (!templateWithData && !template && !block) {
		const branch = globSync(`${configUtils.projectRoot}/src/*.?(pug|jade)`);
		if (branch.length) {
			console.log('recompiling all branches...');
			branch.forEach(item => configUtils.renderTemplate(configUtils.compileTemplate(item)));
		}
	} else {
		configUtils.getTemplateBranch(templateWithData, template, block).forEach(function (item) {
			console.log(`recompile branch: ${configUtils.shortenAbsolutePath(item)}`);
			configUtils.renderTemplate(configUtils.compileTemplate(item));
		});
	}
}

chokidarWatch(chokidarConfig.paths.globalData, chokidarConfig.options)
	.on('change', function (path, stats) {
		console.log(`change: ${configUtils.shortenAbsolutePath(path)}`);
		handleChanges();
	});
	// .on('add', (path) => {
	// 	handleChanges();
	// 	restartDevServer();
	// })
	// .on('unlink', (path) => {
	// 	handleChanges();
	// 	restartDevServer();
	// });

chokidarWatch(chokidarConfig.paths.layoutsData, chokidarConfig.options)
	.on('change', function (path, stats) {
		console.log(`change: ${configUtils.shortenAbsolutePath(path)}`);
		handleChanges(path, null, null);
	});
	// .on('add', (path) => {
	// 	handleChanges();
	// 	restartDevServer();
	// })
	// .on('unlink', (path) => {
	// 	handleChanges();
	// 	restartDevServer();
	// });

chokidarWatch(chokidarConfig.paths.layouts, chokidarConfig.options)
	.on('change', function (path, stats) {
		// configUtils.templateDependencies.forEach(function(value, key) {
		// 	console.log("TEST DATA #1: " + key);
		// 	console.log("TEST DATA #2: " + value.file);
		// 	console.log("TEST DATA #3: " + value.layout);
		// 	console.log("TEST DATA #4: " + value.blocks);
		// });
		// for (const [key, value] of configUtils.templateDependencies) {
		// 	console.log("TEST DATA #1: " + key);
		// 	console.log("TEST DATA #2: " + value.file);
		// 	console.log("TEST DATA #3: " + value.layout);
		// 	console.log("TEST DATA #4: " + value.blocks);
		// }
		console.log(`change: ${configUtils.shortenAbsolutePath(path)}`);
		handleChanges(null, path, null);
	});
	// .on('add', (path) => {
	// 	handleChanges();
	// 	restartDevServer();
	// })
	// .on('unlink', (path) => {
	// 	handleChanges();
	// 	restartDevServer();
	// });

chokidarWatch(chokidarConfig.paths.blocks, chokidarConfig.options)
	.on('change', function (path, stats) {
		console.log(`change: ${configUtils.shortenAbsolutePath(path)}`);
		handleChanges(null, null, path);
	});
	// .on('add', (path) => {
	// 	handleChanges();
	// 	restartDevServer();
	// })
	// .on('unlink', (path) => {
	// 	handleChanges();
	// 	restartDevServer();
	// });
