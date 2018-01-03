const {
	pathExists,
	remove,
	ensureDir
} = require('fs-extra');
const {
	readFileSync,
	utimes,
	writeFile,
	readFile
} = require('fs');
const {
	resolve,
	join,
	normalize,
	basename,
	dirname,
	isAbsolute,
	extname,
	sep
} = require('path');
const glob = require('glob');
const { bold } = require('chalk');
const { safeLoad } = require('js-yaml');
const {
	compileFile,
	compile
} = require('pug');
const {
	merge,
	isEmpty
} = require('lodash');
const pretty = require('pretty');
const bemto = require('verstat-bemto/index-tabs');
const supportsColor = require('supports-color');
const { loadFront } = require('verstat-front-matter');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const chokidarWatchConfig = require('../configs/chokidar.watch.config');


// storages
const SITE_GRID = [];
const TEMPLATE_DEPENDENCIES = new Map();
let TEMPLATE_DEPENDENCIES_KEY = null;

// paths
const PROJECT_ROOT = resolve(__dirname, '../');
const MEMORY_DIRECTORY = 'memory-fs';
const SOURCE_DIRECTORY = join(PROJECT_ROOT, 'src');
const PAGES_DIRECTORY = join(SOURCE_DIRECTORY, 'pages');
const OUTPUT_DIRECTORY = 'dist';
const PROD_OUTPUT_DIRECTORY = join(PROJECT_ROOT, OUTPUT_DIRECTORY);
const DEV_OUTPUT_DIRECTORY = '/';
const POSTCSS_CONFIG = join(PROJECT_ROOT, 'configs', 'postcss.config.js');

// data
let TEMPLATES;
let TEMPLATES_GRID;
let TEMPLATES_NO_GRID;
let TEMPLATES_NO_GRID_SIZE;
let LAYOUTS;
let BLOCKS;
let GLOBAL_DATA;
let COMMONS;
const COMPILE_TEMPLATE_DELAY = 10;
const COMPILE_SITE_GRID_DELAY = 5;
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


function customReadFileSync(file, encoding = 'utf8') {
	return readFileSync(file, { encoding });
}

function customReadFile(file, encoding = 'utf8') {
	return new Promise((resolvePromise, rejectPromise) => {
		readFile(file, { encoding }, (err, data) => {
			if (err) rejectPromise(new Error(err));
			resolvePromise(data);
		});
	});
}

function isString(str) {
	return typeof str === 'string' || str instanceof String;
}

function normalizeArray(arr) {
	return arr.map(item => normalize(item));
}

function prettifyHTML(str, options) {
	if (isString(str)) {
		const defaultOptions = {
			ocd: true,
			indent_char: '\t',
			indent_size: 1
		};
		return pretty(str, options ? merge({}, defaultOptions, options) : defaultOptions);
	}
}

function getFiles(filePath, index) {
	return new Promise((resolvePromise, rejectPromise) => {
		glob(filePath, (err, matches) => {
			if (err) rejectPromise(new Error(err));
			if (index !== undefined) {
				resolvePromise(normalize(matches[index]));
			} else {
				resolvePromise(normalizeArray(matches));
			}
		});
	});
}

function generateEntry(server) {
	const entry = glob.sync(`${PROJECT_ROOT}/src/assets/*.js`);
	if (entry.length) {
		const obj = {};
		const file = entry[0];
		const objProp = basename(file, '.js');
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
	if (vendor.length) {
		return `${basename(vendor[0], '.js')}.vendor`;
	}
	return 'vendor';
}

function getModifiedNib(filePath) {
	const dirPath = dirname(filePath);
	if (customReadFileSync(filePath).indexOf('path: fallback') !== -1) {
		return join(dirPath, 'nib-mod-fallback.styl');
	}
	return join(dirPath, 'nib-mod.styl');
}

function shortenPath(filePath) {
	if (isAbsolute(filePath)) {
		return filePath.replace(PROJECT_ROOT, basename(PROJECT_ROOT)).replace(/(\\{2}|\\)/g, '/');
	}
	return filePath.replace(/(\\{2}|\\)/g, '/');
}

function boldString(filePath) {
	if (supportsColor) return bold(filePath);
	return filePath;
}

async function removeDirectory(filePath) {
	if (await pathExists(filePath)) {
		return remove(filePath).then(() => {
			console.log(boldString('unlinkDir:'), shortenPath(filePath));
		});
	}
}

// function removeDirectorySync(filePath) {
// 	if (fse.pathExistsSync(filePath)) {
// 		fse.removeSync(filePath);
// 		console.log(boldString('unlinkDir:'), shortenPath(filePath));
// 	}
// }

function createDirectory(filePath) {
	return ensureDir(filePath)
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
		utimes(filePath, timeThen, timeThen, (err) => {
			if (err) throw err;
			cb();
		});
	} else if (number > 0) {
		const timeThen = (Date.now() / 1000) + Math.abs(number);
		utimes(filePath, timeThen, timeThen, (err) => {
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
	if (!isEmpty(data)) {
		return new Promise((resolvePromise, rejectPromise) => {
			const filePath = join(PAGES_DIRECTORY, data.filename);
			writeFile(filePath, data.content, 'utf8', (err) => {
				if (err) rejectPromise(new Error(err));
				changeFileTimestamp(-10, filePath, () => {
					resolvePromise(console.log(boldString(`${event}:`), shortenPath(filePath)));
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
	SITE_GRID.push({
		title: title || null,
		url: url.replace(extname(url), '.html').replace(SOURCE_DIRECTORY, '').replace(/(\\{2}|\\)/g, '/'),
		layout: layout.replace(join(SOURCE_DIRECTORY, sep), '').replace(/(\\{2}|\\)/g, '/')
	});
}

function compileSiteGrid(template) {
	return new Promise((resolvePromise, rejectPromise) => {
		setTimeout(() => {
			const fn = compileFile(template, { compileDebug: true });
			const locals = { siteGrid: SITE_GRID };
			resolvePromise({
				filename: `${basename(template, extname(template))}.html`,
				content: fn(locals)
			});
		}, COMPILE_SITE_GRID_DELAY);
	});
}

function removeSiteGridItem(filePath) {
	const item = filePath.replace(join(SOURCE_DIRECTORY, sep), '').replace(extname(filePath), '');
	const itemIndex = SITE_GRID.findIndex((element) => {
		const elementLayout = element.layout;
		return elementLayout ? elementLayout.replace(extname(elementLayout), '') === item : false;
	});
	if (itemIndex !== -1) SITE_GRID.splice(itemIndex, 1);
}

function compileBlock(mod, block, isBlocksChanged) {
	const blocks = isBlocksChanged ? normalizeArray(glob.sync(`${PROJECT_ROOT}/src/blocks/**/*.?(pug|jade)`)) : BLOCKS;
	const index = blocks.findIndex(item => item.indexOf(normalize(`/${block}/`)) !== -1);
	if (index !== -1) {
		const blockPath = blocks[index];
		TEMPLATE_DEPENDENCIES.get(TEMPLATE_DEPENDENCIES_KEY).blocks.set(block, blockPath);
		return compile(`${customReadFileSync(COMMONS)}\n${mod}\n${customReadFileSync(blockPath)}`, { compileDebug: true });
	}
	TEMPLATE_DEPENDENCIES.get(TEMPLATE_DEPENDENCIES_KEY).blocks.set(block, null);
	return compile(`div [block ${block} not found]`, { compileDebug: true });
}

// function renderBlockEngine(blockName, data) {
// 	data.renderBlock = function (blockName, data) {
// 		return renderBlockEngine(blockName, data);
// 	};
// 	return compileBlock(bemto, blockName[0])(data);
// }

function templateDependenciesEngine(template, templateDependencies, data) {
	TEMPLATE_DEPENDENCIES_KEY = basename(data);
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
	const blockName = basename(block, extname(block));
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

async function processGlobalData(arr) {
	const globalData = [];

	for (let i = 0, arrSize = arr.length; i < arrSize; i++) {
		globalData.push(customReadFile(arr[i]));
	}

	const readGlobalData = await Promise.all(globalData);

	return arr.map((file, index) => {
		const obj = {};
		obj[basename(file, extname(file))] = safeLoad(readGlobalData[index]);
		return obj;
	});
}

async function getGlobalData(data) {
	if (Array.isArray(data)) {
		return data.length ? merge({}, ...await processGlobalData(data)) : {};
	}
	GLOBAL_DATA[basename(data, extname(data))] = safeLoad(await customReadFile(data));
	return GLOBAL_DATA;
}

function compileTemplate(filePath, globalData = GLOBAL_DATA, isBlocksChanged = false) {
	return new Promise((resolvePromise, rejectPromise) => {
		setTimeout(() => {
			const extractedData = loadFront(filePath, '\/\/---', 'content');
			const modifiedExtractedData = merge({}, extractedData);
			delete modifiedExtractedData.layout;
			delete modifiedExtractedData.content;
			const extractedDataLayout = extractedData.layout;
			const layoutIndex = extractedDataLayout ? LAYOUTS.findIndex(item => item.indexOf(normalize(extractedDataLayout)) !== -1) : -1;
			if (layoutIndex !== -1) {
				const layout = LAYOUTS[layoutIndex];
				const fn = compileFile(layout, { compileDebug: true });
				siteGridEngine(
					extractedData.title,
					filePath,
					extname(extractedDataLayout).length ? extractedDataLayout : `${extractedDataLayout}${extname(layout)}`
				);
				templateDependenciesEngine(
					layout,
					fn.dependencies.filter(item => item.indexOf(normalize('/layouts/')) !== -1),
					filePath
				);
				const initialLocals = {
					NODE_ENV: process.env.NODE_ENV,
					renderBlock: function renderBlockEngine(blockName, data) {
						data.renderBlock = function (blockName, data) {
							return renderBlockEngine(blockName, data);
						};
						return compileBlock(bemto, blockName[0], isBlocksChanged)(data);
					},
					file: modifiedExtractedData,
					content: (function () {
						const fn = compile(`${bemto}\n${extractedData.content}`, { compileDebug: true });
						const initialLocals = {
							renderBlock: function renderBlockEngine(blockName, data) {
								data.renderBlock = function (blockName, data) {
									return renderBlockEngine(blockName, data);
								};
								return compileBlock(bemto, blockName[0], isBlocksChanged)(data);
							}
						};
						const locals = merge({}, initialLocals, modifiedExtractedData, globalData);
						return fn(locals);
					})()
				};
				const locals = merge({}, initialLocals, globalData);
				resolvePromise({
					filename: `${basename(filePath, extname(filePath))}.html`,
					content: fn(locals)
				});
			} else {
				resolvePromise({});
			}
		}, COMPILE_TEMPLATE_DELAY);
	});
}

async function initTemplateEngine(cb, outputPath, memoryFS, compiler, browserSync) {
	TEMPLATES = await getFiles(`${PROJECT_ROOT}/src/*.?(pug|jade)`);
	TEMPLATES_GRID = await getFiles(`${PROJECT_ROOT}/src/sitegrid.?(pug|jade)`, 0);
	TEMPLATES_NO_GRID = TEMPLATES_GRID ? await getFiles(`${PROJECT_ROOT}/src/!(sitegrid).?(pug|jade)`) : TEMPLATES.slice();
	TEMPLATES_NO_GRID_SIZE = TEMPLATES_NO_GRID.length;
	LAYOUTS = await getFiles(`${PROJECT_ROOT}/src/layouts/*.?(pug|jade)`);
	BLOCKS = await getFiles(`${PROJECT_ROOT}/src/blocks/**/*.?(pug|jade)`);
	GLOBAL_DATA = await getGlobalData(await getFiles(`${PROJECT_ROOT}/src/data/*.?(yml|yaml)`));
	COMMONS = await getFiles(`${PROJECT_ROOT}/src/globals/commons.?(pug|jade)`, 0);

	// initAdjacentDirectories(
	// 	outputPath,
	// 	outputFileSystem,
	// 	compiler,
	// 	browserSync,
	// 	['assets', 'blocks', 'data', 'globals', 'layouts', 'pages', 'vendor', '*.*']
	// );

	const renderTemplates = [];
	const compileTemplates = [];

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

	for (let i = 0; i < TEMPLATES_NO_GRID_SIZE; i++) {
		console.log(boldString('compile branch:'), shortenPath(TEMPLATES_NO_GRID[i]));
		compileTemplates.push(compileTemplate(TEMPLATES_NO_GRID[i]));
	}

	if (TEMPLATES_GRID) {
		console.log(boldString('compile branch:'), shortenPath(TEMPLATES_GRID));
		compileTemplates.push(compileSiteGrid(TEMPLATES_GRID));
	}

	const compiledTemplates = await Promise.all(compileTemplates);
	const compiledTemplatesSize = compiledTemplates.length;

	for (let i = 0; i < compiledTemplatesSize; i++) {
		renderTemplates.push(renderTemplate(compiledTemplates[i]));
	}

	await Promise.all(renderTemplates);

	if (cb) {
		cb(TEMPLATES_NO_GRID, TEMPLATES_NO_GRID_SIZE, GLOBAL_DATA);
	}
}

function addHtmlWebpackPlugins() {
	// for (const [key, value] of TEMPLATE_DEPENDENCIES) {
	// 	const { file, layout, layoutDependencies, blocks } = value;
	// 	console.log('------------------------------------------------------');
	// 	console.log('key:', key);
	// 	console.log('file:', file);
	// 	console.log('layout:', layout);
	// 	console.log('layout_dependencies:', layoutDependencies);
	// 	console.log('blocks:', blocks);
	// }

	// console.log('------------------------------------------------------');
	// console.log('SITE_GRID:', SITE_GRID);


	return glob.sync(`${PROJECT_ROOT}/src/pages/*.html`).map((item) => {
		const filename = basename(item);
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
