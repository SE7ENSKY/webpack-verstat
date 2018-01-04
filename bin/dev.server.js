require('console-stamp')(console, {
	pattern: 'HH:MM:ss',
	label: false
});

const {
	basename,
	extname,
	join,
	resolve,
	normalize
} = require('path');
const MemoryFileSystem = require('memory-fs');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
// const webpackHotMiddleware = require('webpack-hot-middleware');
const browserSync = require('browser-sync').create();
const webpackDevConfig = require('../configs/webpack.dev.config');
const chokidarWatchConfig = require('../configs/chokidar.watch.config');
const consoleOutputConfig = require('../configs/console.output.config');
const {
	PROJECT_ROOT,
	PROD_OUTPUT_DIRECTORY,
	customReadFile,
	getFiles,
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
	hot: false,
	// hot: true,
	lazy: false,
	inline: false,
	// inline: true,
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
		// const webpackHotMiddlewareInstance = webpackHotMiddleware(compiler);
		let isBlocksUpdate = false;
		let isCommonsUpdate = false;

		async function processData(templates, templatesSize, data) {
			const renderTemplates = [];
			const compileTemplates = [];
			const blocks = isBlocksUpdate ? await getFiles(`${PROJECT_ROOT}/src/blocks/**/*.?(pug|jade)`) : undefined;
			const commons = isCommonsUpdate ? await customReadFile(await getFiles(`${PROJECT_ROOT}/src/globals/commons.?(pug|jade)`, 0)) : undefined;

			for (let i = 0; i < templatesSize; i++) {
				console.log(boldString('recompile branch:'), shortenPath(templates[i]));
				compileTemplates.push(compileTemplate(templates[i], data, blocks, commons));
			}
			const compiledTemplates = await Promise.all(compileTemplates);
			const compiledTemplatesSize = compiledTemplates.length;
			for (let i = 0; i < compiledTemplatesSize; i++) {
				renderTemplates.push(renderTemplate(compiledTemplates[i]));
			}
			await Promise.all(renderTemplates).then(() => {
				isBlocksUpdate = false;
				isCommonsUpdate = false;
				webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
			});
		}

		async function handleChanges(templateWithData, template, block, data) {
			const templateBasename = template ? basename(template, extname(template)) : template;
			if ((!templateWithData && !block) && (!template || templateBasename === 'root' || templateBasename === 'main')) {
				if (templatesNoGridSize) {
					await processData(templatesNoGrid, templatesNoGridSize, data ? await getGlobalData(data) : data);
				}
			} else {
				const templateBranches = getTemplateBranches(templateWithData, template, block);
				await processData(templateBranches, templateBranches.length, globalData);
			}
		}

		browserSync.init({
			ui: {
				port: uiPort
			},
			open: false,
			notify: false,
			reloadOnRestart: true,
			// reloadDebounce: 100,
			watchOptions: chokidarWatchConfig,
			port: devServerConfig.port,
			server: {
				baseDir: PROD_OUTPUT_DIRECTORY,
				middleware: [
					webpackDevMiddlewareInstance
					// webpackHotMiddlewareInstance
				]
			},
			files: [
				{
					match: `${PROJECT_ROOT}/src/data/*.(yml|yaml)`,
					fn: (event, file) => {
						const resolvedFile = normalize(resolve(PROJECT_ROOT, file));
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
						const resolvedFile = normalize(resolve(PROJECT_ROOT, file));
						switch (event) {
							case 'change':
								if (basename(resolvedFile, extname(resolvedFile)) !== 'sitegrid') {
									console.log(boldString(`${event}:`), shortenPath(resolvedFile));
									handleChanges(resolvedFile, null, null);
								}
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
						const resolvedFile = normalize(resolve(PROJECT_ROOT, file));
						switch (event) {
							case 'change':
								console.log(boldString(`${event}:`), shortenPath(resolvedFile));
								handleChanges(null, resolvedFile, null);
								break;
							case 'add':
							case 'unlink':
								console.log(boldString(`${event}:`), shortenPath(resolvedFile));
								if (getTemplateBranches(null, resolvedFile, null).length) {
									changeFileTimestamp(1, join(PROJECT_ROOT, 'bin', 'dev.server.js'));
								} else {
									handleChanges(null, resolvedFile, null);
								}
								break;
							// no default
						}
					}
				},
				{
					match: `${PROJECT_ROOT}/src/blocks/**/*.?(pug|jade)`,
					fn: (event, file) => {
						const resolvedFile = normalize(resolve(PROJECT_ROOT, file));
						switch (event) {
							case 'add':
								console.log(boldString(`${event}:`), shortenPath(resolvedFile));
								isBlocksUpdate = true;
								addBlockToTemplateBranch(resolvedFile);
								handleChanges(null, null, resolvedFile);
								break;
							case 'change':
								console.log(boldString(`${event}:`), shortenPath(resolvedFile));
								handleChanges(null, null, resolvedFile);
								break;
							case 'unlink':
								console.log(boldString(`${event}:`), shortenPath(resolvedFile));
								isBlocksUpdate = true;
								handleChanges(null, null, resolvedFile);
								break;
							// no default
						}
					}
				},
				{
					match: [
						`${PROJECT_ROOT}/src/assets/**/*.?(coffee|js|css|styl|less|sass|scss)`,
						`${PROJECT_ROOT}/src/blocks/**/*.?(coffee|js|css|styl|less|sass|scss)`,
						`${PROJECT_ROOT}/src/globals/**/*.?(coffee|js|css|styl|less|sass|scss)`,
						`${PROJECT_ROOT}/src/vendor/**/*.?(coffee|js|css|styl|less|sass|scss)`
					],
					fn: (event, file) => {
						const resolvedFile = normalize(resolve(PROJECT_ROOT, file));
						switch (event) {
							case 'add':
							case 'change':
							case 'unlink':
								console.log(boldString(`${event}:`), shortenPath(resolvedFile));
								webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
								break;
							// no default
						}
					}
				},
				{
					match: `${PROJECT_ROOT}/src/globals/commons.?(pug|jade)`,
					fn: (event, file) => {
						const resolvedFile = normalize(resolve(PROJECT_ROOT, file));
						if (event === 'change') {
							console.log(boldString(`${event}:`), shortenPath(resolvedFile));
							isCommonsUpdate = true;
							handleChanges(null, null, null);
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
