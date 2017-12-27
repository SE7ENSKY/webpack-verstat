const fse = require('fs-extra');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const chalk = require('chalk');
const jsYaml = require('js-yaml');
const pug = require('pug');
const _ = require('lodash');
const bemto = require('verstat-bemto/index-tabs');
const supportsColor = require('supports-color');
const verstatFrontMatter = require('verstat-front-matter');
const HtmlWebpackPlugin = require('html-webpack-plugin');
// const cssnanoBaseConfig = require('../config/cssnano.base.config');
// const cssnanoMinifyConfig = require('../config/cssnano.minify.config');
// const perfectionistConfig = require('../config/perfectionist.config');
// const consoleOutputConfig = require('../config/console.output.config');
// const chokidarWatchConfig = require('../config/chokidar.watch.config');


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
const POSTCSS_CONFIG = path.join(PROJECT_ROOT, 'config', 'postcss.config.js');

// constants
const TEMPLATES = glob.sync(`${PROJECT_ROOT}/src/*.?(pug|jade)`);
const TEMPLATES_GRID = glob.sync(`${PROJECT_ROOT}/src/sitegrid.?(pug|jade)`)[0];
const TEMPLATES_NO_GRID = TEMPLATES_GRID ? TEMPLATES.filter(item => item !== TEMPLATES_GRID) : TEMPLATES.slice();
const COMMONS = glob.sync(`${PROJECT_ROOT}/src/globals/commons.?(pug|jade)`)[0];
const LAYOUTS = glob.sync(`${PROJECT_ROOT}/src/layouts/*.?(pug|jade)`);
const GLOBAL_DATA = getGlobalData();
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

function customReadFile(file, encoding = 'utf8') {
	return fs.readFileSync(file, { encoding });
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

function removeDirectory(filePath) {
	if (fs.existsSync(filePath)) {
		fse.removeSync(filePath);
		console.log(boldString('unlinkDir:'), shortenPath(filePath));
	}
}

function createDirectory(filePath) {
	fse.ensureDirSync(filePath);
	console.log(boldString('addDir:'), shortenPath(filePath));
}

function changeFileTimestamp(number, filePath) {
	if (number < 0) {
		const timeThen = (Date.now() / 1000) - Math.abs(number);
		fs.utimesSync(filePath, timeThen, timeThen);
	} else if (number > 0) {
		const timeThen = (Date.now() / 1000) + Math.abs(number);
		fs.utimesSync(filePath, timeThen, timeThen);
	}
}

function renderTemplate(data, event = 'add') {
	if (!_.isEmpty(data)) {
		const filePath = path.join(PAGES_DIRECTORY, data.filename);
		fs.writeFileSync(filePath, data.content, 'utf-8');
		changeFileTimestamp(-10, filePath);
		console.log(boldString(`${event}:`), shortenPath(filePath));
	}
}

function siteGridEngine(title, url, layout) {
	const srcPath = SOURCE_DIRECTORY.replace(/\\/g, '/');
	SITE_GRID.push({
		title: title || null,
		url: url.replace(path.extname(url), '.html').replace(/\\/g, '/').replace(srcPath, ''),
		layout: layout.replace(path.join(srcPath, path.sep), '').replace(/\\/g, '/')
	});
}

function compileSiteGrid(template) {
	const fn = pug.compileFile(template);
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

function compileBlock(mod, block) {
	const blocks = glob.sync(`${PROJECT_ROOT}/src/blocks/**/*.?(pug|jade)`);
	const index = blocks.findIndex(item => item.indexOf(`/${block}/`) !== -1);
	if (index !== -1) {
		const blockPath = blocks[index];
		TEMPLATE_DEPENDENCIES.get(TEMPLATE_DEPENDENCIES_KEY).blocks.set(block, blockPath);
		return pug.compile(`${customReadFile(COMMONS)}\n${mod}\n${customReadFile(blockPath)}`);
	}
	TEMPLATE_DEPENDENCIES.get(TEMPLATE_DEPENDENCIES_KEY).blocks.set(block, null);
	return pug.compile(`div [block ${block} not found]`);
}

function renderBlockEngine(blockName, data) {
	data.renderBlock = function (blockName, data) {
		return renderBlockEngine(blockName, data);
	};
	return compileBlock(bemto, blockName[0])(data);
}

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

function getGlobalData(filePath) {
	if (!filePath) {
		const data = glob.sync(`${PROJECT_ROOT}/src/data/*.?(yml|yaml)`);
		return data.length ? _.merge({}, ...processGlobalData(data)) : {};
	}
	GLOBAL_DATA[path.basename(filePath, path.extname(filePath))] = jsYaml.safeLoad(customReadFile(filePath));
	return GLOBAL_DATA;
}

function compileTemplate(filePath, globalData = GLOBAL_DATA) {
	const extractedData = verstatFrontMatter.loadFront(filePath, '\/\/---', 'content');
	const modifiedExtractedData = _.merge({}, extractedData);
	delete modifiedExtractedData.layout;
	delete modifiedExtractedData.content;
	const extractedDataLayout = extractedData.layout;
	const layoutIndex = LAYOUTS.findIndex(item => item.indexOf(extractedData.layout) !== -1);
	if (layoutIndex !== -1) {
		const layout = LAYOUTS[layoutIndex];
		const fn = pug.compileFile(layout);
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
			renderBlock: renderBlockEngine,
			file: modifiedExtractedData,
			content: (function () {
				const fn = pug.compile(`${bemto}\n${extractedData.content}`);
				const initialLocals = { renderBlock: renderBlockEngine };
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

function addHtmlWebpackPlugins(outputPath, memoryFS, compiler, browserSync) {
	if (process.env.SOURCEMAP) {
		SITE_GRID.push({
			title: BUNDLE_STATISTICS.title,
			url: BUNDLE_STATISTICS.url,
			layout: null
		});
	}

	removeDirectory(PROD_OUTPUT_DIRECTORY);
	removeDirectory(PAGES_DIRECTORY);

	createDirectory(PAGES_DIRECTORY);

	for (let i = 0, templatesNoGridSize = TEMPLATES_NO_GRID.length; i < templatesNoGridSize; i++) {
		renderTemplate(compileTemplate(TEMPLATES[i]));
	}

	if (TEMPLATES_GRID) renderTemplate(compileSiteGrid(TEMPLATES_GRID));

	// initAdjacentDirectories // ?

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
	TEMPLATES_NO_GRID,
	PROD_OUTPUT_DIRECTORY,
	DEV_OUTPUT_DIRECTORY,
	BUNDLE_STATISTICS,
	SUPPORTED_BROWSERS_LIST,
	POSTCSS_CONFIG,
	ASSETS_NAMING_CONVENTION,
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
