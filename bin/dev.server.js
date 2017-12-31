require('console-stamp')(console, {
	pattern: 'HH:MM:ss',
	label: false
});

const {
	basename,
	extname,
	join,
	resolve
} = require('path');
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
	PROD_OUTPUT_DIRECTORY,
	boldString,
	addBlockToTemplateBranch,
	changeFileTimestamp,
	shortenPath,
	getTemplateBranches,
	getGlobalData,
	renderTemplate,
	compileTemplate,
	addHtmlWebpackPlugins,
	initTemplateEngine
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
initTemplateEngine(
	(templatesNoGrid, templatesNoGridSize, globalData) => {
		compiler.apply(...addHtmlWebpackPlugins());

		const webpackDevMiddlewareInstance = webpackDevMiddleware(compiler, devServerConfig);
		const webpackHotMiddlewareInstance = webpackHotMiddleware(compiler);

		let isBlocksChanged = false;

		function handleChanges(templateWithData, template, block, data) {
			const templateBasename = template ? basename(template, extname(template)) : template;
			if ((!templateWithData && !block) && (!template || templateBasename === 'root' || templateBasename === 'main')) {
				if (templatesNoGridSize) {
					const globalData2 = data ? getGlobalData(data) : data;
					const renderesTemplates = [];
					console.log(boldString('recompiling all branches...'));
					for (let i = 0; i < templatesNoGridSize; i += 1) {
						renderesTemplates.push(renderTemplate(compileTemplate(templatesNoGrid[i], globalData2)));
					}
					Promise.all(renderesTemplates).then(() => webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload()));
				}
			} else {
				const templateBranches = getTemplateBranches(templateWithData, template, block);
				const renderesTemplates = [];
				for (let i = 0, templateBranchesSize = templateBranches.length; i < templateBranchesSize; i += 1) {
					const templateBranch = templateBranches[i];
					console.log(boldString('recompile branch:'), shortenPath(templateBranch));
					renderesTemplates.push(renderTemplate(compileTemplate(templateBranch, globalData, isBlocksChanged)));
				}
				Promise.all(renderesTemplates).then(() => webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload()));
			}
		}

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
					fn: (event, file) => {
						const resolvedFile = resolve(PROJECT_ROOT, file);
						switch (event) {
							case 'change':
								console.log(boldString(`${event}:`), shortenPath(resolvedFile));
								handleChanges(null, null, null, resolvedFile);
								break;
							case 'add':
							case 'unlink':
								console.log(boldString(`${event}:`), shortenPath(resolvedFile));
								changeFileTimestamp(1, join(PROJECT_ROOT, 'bin', 'dev.server.js'));
								break;
							// no default
						}
					}
				},
				{
					match: `${PROJECT_ROOT}/src/*.?(pug|jade)`,
					fn: (event, file) => {
						const resolvedFile = resolve(PROJECT_ROOT, file);
						switch (event) {
							case 'change':
								console.log(boldString(`${event}:`), shortenPath(resolvedFile));
								handleChanges(resolvedFile.replace(/\\/g, '/'), null, null);
								break;
							case 'add':
							case 'unlink':
								console.log(boldString(`${event}:`), shortenPath(resolvedFile));
								changeFileTimestamp(1, join(PROJECT_ROOT, 'bin', 'dev.server.js'));
								break;
							// no default
						}
					}
				},
				{
					match: `${PROJECT_ROOT}/src/layouts/*.?(pug|jade)`,
					fn: (event, file) => {
						const resolvedFile = resolve(PROJECT_ROOT, file);
						switch (event) {
							case 'change':
								console.log(boldString(`${event}:`), shortenPath(resolvedFile));
								handleChanges(null, resolvedFile.replace(/\\/g, '/'), null);
								break;
							case 'add':
							case 'unlink':
								console.log(boldString(`${event}:`), shortenPath(resolvedFile));
								if (getTemplateBranches(null, resolvedFile.replace(/\\/g, '/'), null).length) {
									changeFileTimestamp(1, join(PROJECT_ROOT, 'bin', 'dev.server.js'));
								} else {
									handleChanges(null, resolvedFile.replace(/\\/g, '/'), null);
								}
								break;
							// no default
						}
					}
				},
				{
					match: `${PROJECT_ROOT}/src/blocks/**/*.?(pug|jade)`,
					fn: (event, file) => {
						const resolvedFile = resolve(PROJECT_ROOT, file);
						switch (event) {
							case 'add':
								console.log(boldString(`${event}:`), shortenPath(resolvedFile));
								isBlocksChanged = true;
								addBlockToTemplateBranch(resolvedFile.replace(/\\/g, '/'));
								handleChanges(null, null, resolvedFile.replace(/\\/g, '/'));
								break;
							case 'change':
							case 'unlink':
								console.log(boldString(`${event}:`), shortenPath(resolvedFile));
								if (event === 'unlink') isBlocksChanged = true;
								handleChanges(null, null, resolvedFile.replace(/\\/g, '/'));
								break;
							// no default
						}
					}
				},
				{
					match: `${PROJECT_ROOT}/src/blocks/**/*.coffee`,
					fn: (event) => {
						if (event === 'change') webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
					}
				},
				{
					match: `${PROJECT_ROOT}/src/globals/commons.?(pug|jade)`,
					fn: (event, file) => {
						const resolvedFile = resolve(PROJECT_ROOT, file);
						switch (event) {
							case 'change':
								console.log(boldString(`${event}:`), shortenPath(resolvedFile));
								handleChanges(null, null, null);
								break;
							case 'add':
							case 'unlink':
								console.log(boldString(`${event}:`), shortenPath(resolvedFile));
								changeFileTimestamp(1, join(PROJECT_ROOT, 'bin', 'dev.server.js'));
								break;
							// no default
						}
					}
				}
			]
		});
	},
	webpackDevConfig.output.path,
	compiler.outputFileSystem,
	compiler,
	browserSync
);
