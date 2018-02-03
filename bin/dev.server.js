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
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
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
	redString,
	addBlockToTemplateBranch,
	changeFileTimestamp,
	shortenPath,
	getTemplateBranches,
	getGlobalData,
	renderTemplate,
	compileTemplate,
	compileEmailTemplate,
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
	lazy: false,
	inline: false,
	https: false,
	host: 'localhost',
	port,
	stats: consoleOutputConfig
};

// fix for '[nodemon] app crashed' and pug exceptions
process.on('uncaughtException', error => console.log(boldString(redString('caught exception:')), error));

const compiler = webpack(webpackDevConfig);
initTemplateEngine((templatesNoGrid, templatesNoGridSize, globalData) => {
	compiler.apply(...addHtmlWebpackPlugins());

	const webpackDevMiddlewareInstance = webpackDevMiddleware(compiler, devServerConfig);
	let isBlocksUpdate = false;
	let isCommonsUpdate = false;

	async function processData(templates, templatesSize, data) {
		const renderTemplates = [];
		const compileTemplates = [];
		const blocks = isBlocksUpdate ? await getFiles(`${PROJECT_ROOT}/src/blocks/**/*.?(pug|jade)`) : undefined;
		const commons = isCommonsUpdate ? await customReadFile(await getFiles(`${PROJECT_ROOT}/src/globals/commons.?(pug|jade)`, 0)) : undefined;
		for (let i = 0; i < templatesSize; i++) {
			compileTemplates.push(compileTemplate(templates[i], data, blocks, commons));
		}
		for (let i = 0, compileTemplatesSize = compileTemplates.length; i < compileTemplatesSize; i++) {
			renderTemplates.push(renderTemplate(compileTemplates[i], compileTemplates[i].to));
		}
		Promise.all(renderTemplates).then(() => {
			isBlocksUpdate = false;
			isCommonsUpdate = false;
			webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
		});
	}

	async function handleChanges(templateWithData, template, block, data) {
		try {
			const templateBasename = template ? basename(template, extname(template)) : template;
			if ((!templateWithData && !block) && (!template || templateBasename === 'root' || templateBasename === 'main')) {
				if (templatesNoGridSize) {
					await processData(templatesNoGrid, templatesNoGridSize, data ? await getGlobalData(data) : data);
				}
			} else {
				const templateBranches = getTemplateBranches(templateWithData, template, block);
				await processData(templateBranches, templateBranches.length, globalData);
			}
		} catch (error) {
			if (error.src) delete error.src;
			if (error.mark) delete error.mark;
			console.log(boldString(redString('error:')), error);
		}
	}

	async function handleEmailTemplate(filePath) {
		try {
			const compiledEmailTemplate = compileEmailTemplate(filePath);
			await renderTemplate(compiledEmailTemplate, compiledEmailTemplate.to);
			webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
		} catch (error) {
			if (error.src) delete error.src;
			console.log(boldString(redString('error:')), error);
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
			},
			{
				match: `${PROJECT_ROOT}/src/emails/**/*.?(mjml|pug|jade|html)`,
				fn: (event, file) => {
					const resolvedFile = normalize(resolve(PROJECT_ROOT, file));
					switch (event) {
						case 'change':
							console.log(boldString(`${event}:`), shortenPath(resolvedFile));
							handleEmailTemplate(resolvedFile);
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
});
