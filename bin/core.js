const fse = require('fs-extra');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const chalk = require('chalk');
const jsYaml = require('js-yaml');
const pug = require('pug');
const _ = require('lodash');
const pretty = require('pretty');
const progressBar = require('progress');
const bemto = require('verstat-bemto/index-tabs');
const supportsColor = require('supports-color');
const verstatFrontMatter = require('verstat-front-matter');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const chokidarWatchConfig = require('../configs/chokidar.watch.config');


// TODO progress для асинхронних обчислень
// TODO замінить for of
// TODO відключить індивідальний резолв ассетів
// TODO destructuring assignment для require
// TODO зробить adjacent directories
// TODO передивитись політику шляхів


// storages
const SITE_GRID = [];
const TEMPLATE_DEPENDENCIES = new Map();
let TEMPLATE_DEPENDENCIES_KEY = null;

// paths
const PROJECT_ROOT = path.resolve(__dirname, '../');
const MEMORY_DIRECTORY = 'memory-fs';
const SOURCE_DIRECTORY = path.join(PROJECT_ROOT, 'src');
const PAGES_DIRECTORY = path.join(SOURCE_DIRECTORY, 'pages');
const OUTPUT_DIRECTORY = 'dist';
const PROD_OUTPUT_DIRECTORY = path.join(PROJECT_ROOT, OUTPUT_DIRECTORY);
const DEV_OUTPUT_DIRECTORY = '/';
const POSTCSS_CONFIG = path.join(PROJECT_ROOT, 'configs', 'postcss.config.js');

// data
let TEMPLATES;
let TEMPLATES_GRID;
let TEMPLATES_NO_GRID;
let TEMPLATES_NO_GRID_SIZE;
let LAYOUTS;
let BLOCKS;
let GLOBAL_DATA;
let COMMONS;
const ASSETS_NAMING_CONVENTION = {
	images: 'i',
	fonts: 'f',
	videos: 'v',
	scripts: 'scripts',
	styles: 'styles'
};
const BUNDLE_STATISTICS = {
	title: 'Bundle statistics',
	url: '/bundle-statistics.html'
};
const SUPPORTED_BROWSERS_LIST = [
	'last 3 versions',
	'Explorer >= 11',
	'Safari >= 9'
];


function customReadFile(file, encoding = 'utf8') {
	return fs.readFileSync(file, { encoding });
}

function isString(str) {
	return typeof str === 'string' || str instanceof String;
}

function prettifyHTML(str, options) {
	if (isString(str)) {
		const defaultOptions = {
			ocd: true,
			indent_char: '\t',
			indent_size: 1
		};
		return pretty(str, options ? _.merge({}, defaultOptions, options) : defaultOptions);
	}
}

function getFiles(filePath, index) {
	return new Promise((resolve, reject) => {
		glob(filePath, (err, matches) => {
			if (err) reject(new Error(err));
			if (index !== undefined) {
				resolve(matches[index]);
			} else {
				resolve(matches);
			}
		});
	});
}

function generateEntry(server) {
	const entry = glob.sync(`${PROJECT_ROOT}/src/assets/*.js`);
	if (entry.length) {
		const obj = {};
		const file = entry[0];
		const objProp = path.basename(file, '.js');
		obj[objProp] = [file.replace(SOURCE_DIRECTORY, '.')];
		if (Array.isArray(server)) {
			server.reverse().forEach(item => obj[objProp].unshift(item));
		}
		return obj;
	}
	return null;
}

function gererateVendor() {
	const vendor = glob.sync(`${PROJECT_ROOT}/src/assets/*.js`);
	if (vendor.length) return `${path.basename(vendor[0], '.js')}.vendor`;
	return 'vendor';
}

function getModifiedNib(filePath) {
	const dirPath = path.dirname(filePath);
	if (customReadFile(filePath).indexOf('path: fallback') !== -1) {
		return path.join(dirPath, 'nib-mod-fallback.styl');
	}
	return path.join(dirPath, 'nib-mod.styl');
}

function shortenPath(filePath) {
	if (path.isAbsolute(filePath)) {
		return filePath.replace(PROJECT_ROOT, path.basename(PROJECT_ROOT)).replace(/\\/g, '/');
	}
	return filePath.replace(/\\/g, '/');
}

function boldString(filePath) {
	if (supportsColor) return chalk.bold(filePath);
	return filePath;
}

async function removeDirectory(filePath) {
	try {
		if (await fse.pathExists(filePath)) await fse.remove(filePath);
	} catch (err) {
		throw new Error(err);
	}
}

// function removeDirectorySync(filePath) {
// 	if (fse.pathExistsSync(filePath)) {
// 		fse.removeSync(filePath);
// 		console.log(boldString('unlinkDir:'), shortenPath(filePath));
// 	}
// }

function createDirectory(filePath) {
	return fse.ensureDir(filePath)
		.then(() => { console.log(boldString('addDir:'), shortenPath(filePath)); })
		.catch((err) => { throw err; });
}

// function createDirectorySync(filePath) {
// 	fse.ensureDirSync(filePath);
// 	console.log(boldString('addDir:'), shortenPath(filePath));
// }

function changeFileTimestamp(number, filePath, cb) {
	if (number < 0) {
		const timeThen = (Date.now() / 1000) - Math.abs(number);
		fs.utimes(filePath, timeThen, timeThen, (err) => {
			if (err) throw err;
			cb();
		});
	} else if (number > 0) {
		const timeThen = (Date.now() / 1000) + Math.abs(number);
		fs.utimes(filePath, timeThen, timeThen, (err) => {
			if (err) throw err;
			cb();
		});
	}
}

// function changeFileTimestampSync(number, filePath) {
// 	if (number < 0) {
// 		const timeThen = (Date.now() / 1000) - Math.abs(number);
// 		fs.utimesSync(filePath, timeThen, timeThen);
// 	} else if (number > 0) {
// 		const timeThen = (Date.now() / 1000) + Math.abs(number);
// 		fs.utimesSync(filePath, timeThen, timeThen);
// 	}
// }

function renderTemplate(data, event = 'add') {
	if (!_.isEmpty(data)) {
		const filePath = path.join(PAGES_DIRECTORY, data.filename);
		return new Promise((resolve, reject) => {
			fs.writeFile(filePath, data.content, 'utf8', (err) => {
				if (err) reject(new Error(err));
				changeFileTimestamp(-10, filePath, () => {
					resolve(console.log(boldString(`${event}:`), shortenPath(filePath)));
				});
			});
		});
	}
}

// function renderTemplateSync(data, event = 'add') {
// 	if (!_.isEmpty(data)) {
// 		const filePath = path.join(PAGES_DIRECTORY, data.filename);
// 		fs.writeFileSync(filePath, data.content, 'utf-8');
// 		changeFileTimestampSync(-10, filePath);
// 		console.log(boldString(`${event}:`), shortenPath(filePath));
// 	}
// }

function siteGridEngine(title, url, layout) {
	const srcPath = SOURCE_DIRECTORY.replace(/\\/g, '/');
	SITE_GRID.push({
		title: title || null,
		url: url.replace(path.extname(url), '.html').replace(/\\/g, '/').replace(srcPath, ''),
		layout: layout.replace(path.join(srcPath, path.sep), '').replace(/\\/g, '/')
	});
}

function compileSiteGrid(template) {
	const fn = pug.compileFile(template, { compileDebug: true });
	const locals = { siteGrid: SITE_GRID };
	return {
		filename: `${path.basename(template, path.extname(template))}.html`,
		content: fn(locals)
	};
}

function removeSiteGridItem(filePath) {
	const item = filePath.replace(path.join(SOURCE_DIRECTORY, path.sep), '').replace(path.extname(filePath), '');
	const itemIndex = SITE_GRID.findIndex((element) => {
		const elementLayout = element.layout;
		return elementLayout ? elementLayout.replace(path.extname(elementLayout), '') === item : false;
	});
	if (itemIndex !== -1) SITE_GRID.splice(itemIndex, 1);
}

function compileBlock(mod, block, isBlocksChanged) {
	const blocks = isBlocksChanged ? glob.sync(`${PROJECT_ROOT}/src/blocks/**/*.?(pug|jade)`) : BLOCKS;
	const index = blocks.findIndex(item => item.indexOf(`/${block}/`) !== -1);
	if (index !== -1) {
		const blockPath = blocks[index];
		TEMPLATE_DEPENDENCIES.get(TEMPLATE_DEPENDENCIES_KEY).blocks.set(block, blockPath);
		return pug.compile(`${COMMONS ? customReadFile(COMMONS) : ''}\n${mod}\n${customReadFile(blockPath)}`, { compileDebug: true });
	}
	TEMPLATE_DEPENDENCIES.get(TEMPLATE_DEPENDENCIES_KEY).blocks.set(block, null);
	return pug.compile(`div [block ${block} not found]`, { compileDebug: true });
}

// function renderBlockEngine(blockName, data) {
// 	data.renderBlock = function (blockName, data) {
// 		return renderBlockEngine(blockName, data);
// 	};
// 	return compileBlock(bemto, blockName[0])(data);
// }

function templateDependenciesEngine(template, templateDependencies, data) {
	TEMPLATE_DEPENDENCIES_KEY = path.basename(data);
	TEMPLATE_DEPENDENCIES.set(
		TEMPLATE_DEPENDENCIES_KEY,
		{
			file: data,
			layout: template,
			layoutDependencies: templateDependencies,
			blocks: new Map()
		}
	);
}

function addBlockToTemplateBranch(block) {
	const blockName = path.basename(block, path.extname(block));
	for (const [key, value] of TEMPLATE_DEPENDENCIES) {
		for (const [key2, value2] of value.blocks) {
			if (key2 === blockName && value2 === null) {
				value.blocks.set(blockName, block);
			}
		}
	}
}

function getTemplateBranches(templateWithData, template, block) {
	const branch = [];
	if (TEMPLATE_DEPENDENCIES.size) {
		for (const [key, value] of TEMPLATE_DEPENDENCIES) {
			const { file, layout, layoutDependencies, blocks } = value;
			if (file === templateWithData || layout === template || layoutDependencies.some(item => item === template)) {
				branch.push(value.file);
			} else if (blocks.size) {
				for (const [key2, value2] of blocks) {
					if (value2 === block) {
						branch.push(value.file);
					}
				}
			}
		}
	}
	return branch;
}

function processGlobalData(arr) {
	return arr.map((file) => {
		const obj = {};
		obj[path.basename(file, path.extname(file))] = jsYaml.safeLoad(customReadFile(file));
		return obj;
	});
}

function getGlobalData(data) {
	if (Array.isArray(data)) {
		return data.length ? _.merge({}, ...processGlobalData(data)) : {};
	}
	GLOBAL_DATA[path.basename(data, path.extname(data))] = jsYaml.safeLoad(customReadFile(data));
	return GLOBAL_DATA;
}

function compileTemplate(filePath, globalData = GLOBAL_DATA, isBlocksChanged = false) {
	const extractedData = verstatFrontMatter.loadFront(filePath, '\/\/---', 'content');
	const modifiedExtractedData = _.merge({}, extractedData);
	delete modifiedExtractedData.layout;
	delete modifiedExtractedData.content;
	const extractedDataLayout = extractedData.layout;
	const layoutIndex = LAYOUTS.findIndex(item => item.indexOf(extractedData.layout) !== -1);
	if (layoutIndex !== -1) {
		const layout = LAYOUTS[layoutIndex];
		const fn = pug.compileFile(layout, { compileDebug: true });
		siteGridEngine(
			extractedData.title,
			filePath,
			path.extname(extractedDataLayout).length ? extractedDataLayout : `${extractedDataLayout}${path.extname(layout)}`
		);
		templateDependenciesEngine(
			layout,
			fn.dependencies.map(item => item.replace(/\\/g, '/')).filter(item => item.indexOf('/layouts/') !== -1),
			filePath
		);
		const initialLocals = {
			renderBlock: function renderBlockEngine(blockName, data) {
				data.renderBlock = function (blockName, data) {
					return renderBlockEngine(blockName, data);
				};
				return compileBlock(bemto, blockName[0], isBlocksChanged)(data);
			},
			file: modifiedExtractedData,
			content: (function () {
				const fn = pug.compile(`${bemto}\n${extractedData.content}`, { compileDebug: true });
				const initialLocals = {
					renderBlock: function renderBlockEngine(blockName, data) {
						data.renderBlock = function (blockName, data) {
							return renderBlockEngine(blockName, data);
						};
						return compileBlock(bemto, blockName[0], isBlocksChanged)(data);
					}
				};
				const locals = _.merge({}, initialLocals, modifiedExtractedData, globalData);
				return fn(locals);
			})()
		};
		const locals = _.merge({}, initialLocals, globalData);
		return {
			filename: `${path.basename(filePath, path.extname(filePath))}.html`,
			content: fn(locals)
		};
	}
	return {};
}

async function initTemplateEngine(cb, outputPath, memoryFS, compiler, browserSync) {
	try {
		TEMPLATES = await getFiles(`${PROJECT_ROOT}/src/*.?(pug|jade)`);
		TEMPLATES_GRID = await getFiles(`${PROJECT_ROOT}/src/sitegrid.?(pug|jade)`, 0);
		TEMPLATES_NO_GRID = TEMPLATES_GRID ? await getFiles(`${PROJECT_ROOT}/src/!(sitegrid).?(pug|jade)`) : TEMPLATES.slice();
		TEMPLATES_NO_GRID_SIZE = TEMPLATES_NO_GRID.length;
		LAYOUTS = await getFiles(`${PROJECT_ROOT}/src/layouts/*.?(pug|jade)`);
		BLOCKS = await getFiles(`${PROJECT_ROOT}/src/blocks/**/*.?(pug|jade)`);
		GLOBAL_DATA = getGlobalData(await getFiles(`${PROJECT_ROOT}/src/data/*.?(yml|yaml)`));
		COMMONS = await getFiles(`${PROJECT_ROOT}/src/globals/commons.?(pug|jade)`, 0);

		const renderesTemplates = [];

		if (process.env.SOURCEMAP) {
			SITE_GRID.push({
				title: BUNDLE_STATISTICS.title,
				url: BUNDLE_STATISTICS.url,
				layout: null
			});
		}

		await removeDirectory(PROD_OUTPUT_DIRECTORY);
		await removeDirectory(PAGES_DIRECTORY);

		await createDirectory(PAGES_DIRECTORY);

		for (let i = 0; i < TEMPLATES_NO_GRID_SIZE; i += 1) {
			renderesTemplates.push(renderTemplate(compileTemplate(TEMPLATES[i])));
		}
		await Promise.all(renderesTemplates);

		// initAdjacentDirectories(
		// 	outputPath,
		// 	outputFileSystem,
		// 	compiler,
		// 	browserSync,
		// 	['assets', 'blocks', 'data', 'globals', 'layouts', 'pages', 'vendor', '*.*']
		// );

		if (TEMPLATES_GRID) await renderTemplate(compileSiteGrid(TEMPLATES_GRID));

		if (cb) {
			cb(TEMPLATES_NO_GRID, TEMPLATES_NO_GRID_SIZE, GLOBAL_DATA);
		}
	} catch (err) {
		throw new Error(err);
	}
}

function addHtmlWebpackPlugins() {
	return glob.sync(`${PROJECT_ROOT}/src/pages/*.html`).map((item) => {
		const filename = path.basename(item);
		let inject;
		switch (filename) {
			case 'sitegrid.html':
				inject = false;
				break;
			default:
				inject = 'body';
		}
		return new HtmlWebpackPlugin({
			filename,
			template: item,
			cache: true,
			hash: false,
			inject,
			minify: false
		});
	});
}

module.exports = {
	PROJECT_ROOT,
	PROD_OUTPUT_DIRECTORY,
	DEV_OUTPUT_DIRECTORY,
	BUNDLE_STATISTICS,
	SUPPORTED_BROWSERS_LIST,
	POSTCSS_CONFIG,
	ASSETS_NAMING_CONVENTION,
	initTemplateEngine,
	generateEntry,
	gererateVendor,
	getGlobalData,
	boldString,
	addBlockToTemplateBranch,
	changeFileTimestamp,
	shortenPath,
	getTemplateBranches,
	renderTemplate,
	compileTemplate,
	getModifiedNib,
	addHtmlWebpackPlugins
};
