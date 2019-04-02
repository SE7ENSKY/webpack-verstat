const {
	pathExists,
	pathExistsSync,
	remove,
	ensureDir,
	outputFile
} = require('fs-extra');
const {
	readFileSync,
	utimes,
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
const {
	bold,
	red
} = require('chalk');
const { safeLoad } = require('js-yaml');
const mjml = require('mjml');
const {
	compileFile,
	compile
} = require('pug');
// const pretty = require('pretty');
const bemto = require('verstat-bemto/index-tabs');
const supportsColor = require('supports-color');
const { loadFront } = require('verstat-front-matter');
const HtmlWebpackPlugin = require('html-webpack-plugin');


// storages
const SITE_GRID = [];
const TEMPLATE_DEPENDENCIES = new Map();
let TEMPLATE_DEPENDENCIES_KEY = null;

// paths
const PROJECT_ROOT = resolve(__dirname, '../');
const SOURCE_DIRECTORY = join(PROJECT_ROOT, 'src');
const PAGES_DIRECTORY = join(SOURCE_DIRECTORY, 'pages');
const OUTPUT_DIRECTORY = 'dist';
const EMAILS_DIRECTORY = join(SOURCE_DIRECTORY, 'emails');
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
let EMAILS;
let EMAILS_SIZE;
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
	'>0.25%',
	'not op_mini all'
];


function customReadFileSync(file, encoding = 'utf8') {
	return readFileSync(file, { encoding });
}

function customReadFile(file, encoding = 'utf8') {
	return new Promise((resolvePromise, rejectPromise) => {
		readFile(file, { encoding }, (error, data) => {
			if (error) throw error;
			resolvePromise(data);
		});
	});
}

// function isString(str) {
// 	return typeof str === 'string' || str instanceof String;
// }

function normalizeArray(arr) {
	return arr.map(item => normalize(item));
}

// function prettifyHTML(str, options) {
// 	const defaultOptions = {
// 		ocd: true
// 		// indent_char: '\t',
// 		// indent_size: 1
// 	};
// 	return pretty(str, options ? Object.assign({}, defaultOptions, options) : defaultOptions);
// }

function getFiles(filePath, index) {
	return new Promise((resolvePromise, rejectPromise) => {
		glob(filePath, (error, matches) => {
			if (error) throw error;
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

// function gererateVendor() {
// 	const vendor = glob.sync(`${PROJECT_ROOT}/src/assets/*.js`);
// 	if (vendor.length) {
// 		return `${basename(vendor[0], '.js')}.vendor`;
// 	}
// 	return 'vendor';
// }

function getModifiedNib(filePath) {
	const dirPath = dirname(filePath);
	if (customReadFileSync(filePath).indexOf('path: fallback') > -1) {
		return join(dirPath, 'nib-mod-fallback.styl');
	}
	return join(dirPath, 'nib-mod.styl');
}

function toUNIXPath(filePath) {
	return filePath.replace(/(\\{2}|\\)/g, '/');
}

function shortenPath(filePath) {
	if (isAbsolute(filePath)) {
		return toUNIXPath(filePath.replace(PROJECT_ROOT, basename(PROJECT_ROOT)));
	}
	return toUNIXPath(filePath);
}

function boldString(str) {
	if (supportsColor) return bold(str);
	return str;
}

function redString(str) {
	if (supportsColor) return red(str);
	return str;
}

function extractTitleFromHTML(fileContent, openTag = '<title>', closeTag = '</title>') {
	return fileContent.split(openTag).pop().split(closeTag).shift();
}

async function removeDirectory(filePath) {
	if (await pathExists(filePath)) {
		return remove(filePath).then(() => {
			console.log(boldString('unlinkDir:'), shortenPath(filePath));
		});
	}
}

function createDirectory(filePath) {
	return ensureDir(filePath)
		.then(() => { console.log(boldString('addDir:'), shortenPath(filePath)); })
		.catch((error) => { throw error; });
}

function changeFileTimestamp(number, filePath, cb) {
	if (number < 0) {
		const timeThen = (Date.now() / 1000) - Math.abs(number);
		utimes(filePath, timeThen, timeThen, (error) => {
			if (error) throw error;
			if (cb) cb();
		});
	} else if (number > 0) {
		const timeThen = (Date.now() / 1000) + Math.abs(number);
		utimes(filePath, timeThen, timeThen, (error) => {
			if (error) throw error;
			if (cb) cb();
		});
	}
}

function renderTemplate(data, directoryPath) {
	if (Object.keys(data).length) {
		return new Promise((resolvePromise, rejectPromise) => {
			const filePath = join(directoryPath, data.filename);
			outputFile(filePath, data.content, (error) => {
				if (error) throw error;
				changeFileTimestamp(-10, filePath, () => {
					resolvePromise(console.log(boldString('add:'), shortenPath(filePath)));
				});
			});
		});
	}
}

function siteGridEngine(title, url, layout) {
	SITE_GRID.push({
		title: title || null,
		url: toUNIXPath(url.replace(extname(url), '.html').replace(SOURCE_DIRECTORY, '')),
		layout: toUNIXPath(layout.replace(join(SOURCE_DIRECTORY, sep), ''))
	});
}

function compileSiteGrid(filePath) {
	const fn = compile(customReadFileSync(filePath), { compileDebug: true });
	const locals = { siteGrid: SITE_GRID };
	console.log(boldString('compile sitegrid:'), shortenPath(filePath));
	return {
		filename: `${basename(filePath, extname(filePath))}.html`,
		from: SOURCE_DIRECTORY,
		to: PAGES_DIRECTORY,
		content: fn(locals)
	};
}

// function removeSiteGridItem(filePath) {
// 	const item = filePath.replace(join(SOURCE_DIRECTORY, sep), '').replace(extname(filePath), '');
// 	const itemIndex = SITE_GRID.findIndex((element) => {
// 		const elementLayout = element.layout;
// 		return elementLayout ? elementLayout.replace(extname(elementLayout), '') === item : false;
// 	});
// 	if (itemIndex > -1) SITE_GRID.splice(itemIndex, 1);
// }

function compileBlock(mod, block, blocks, commons) {
	const index = blocks.findIndex(item => item.indexOf(normalize(`/${block}/`)) > -1);
	if (index > -1) {
		const blockPath = blocks[index];
		TEMPLATE_DEPENDENCIES.get(TEMPLATE_DEPENDENCIES_KEY).blocks.set(block, blockPath);
		return compile(`${commons}\n${mod}\n${customReadFileSync(blockPath)}`, { compileDebug: true });
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

function compilePUG(filePath, fileExtname) {
	const content = customReadFileSync(filePath);
	if (!content.length) {
		return generateEmailTemplateData(filePath, fileExtname, null);
	}
	const fn = compile(content, { compileDebug: true });
	const locals = {};
	return generateEmailTemplateData(filePath, fileExtname, fn(locals));
}

function compileMJML(filePath, fileExtname) {
	const content = customReadFileSync(filePath);
	if (!content.length) {
		return generateEmailTemplateData(filePath, fileExtname, null);
	}
	const { errors, html } = mjml(content);
	if (errors.length) {
		throw `[${basename(filePath)}] ${errors[0].formattedMessage}`;
	}
	return generateEmailTemplateData(filePath, fileExtname, html);
}

function generateEmailTemplateData(filePath, fileExtname, fileContent) {
	if (!fileContent) return {};
	const fileDirname = dirname(filePath);
	siteGridEngine(
		extractTitleFromHTML(fileContent),
		filePath,
		filePath.replace(`${SOURCE_DIRECTORY}${sep}`, '')
	);
	console.log(boldString('compile email:'), shortenPath(filePath));
	return {
		filename: fileExtname !== '.html' ? `${basename(filePath, fileExtname)}.html` : basename(filePath),
		from: fileDirname,
		to: fileDirname.replace(SOURCE_DIRECTORY, PAGES_DIRECTORY),
		content: fileContent
	};
}

function compileEmailTemplate(filePath) {
	const fileExtname = extname(filePath);
	switch (fileExtname) {
		case '.mjml':
			return compileMJML(filePath, fileExtname);
		case '.pug':
		case '.jade':
			return compilePUG(filePath, fileExtname);
		case '.html':
			const content = customReadFileSync(filePath);
			return generateEmailTemplateData(filePath, fileExtname, content.length ? content : null);
		// no default
	}
}

async function processGlobalData(arr) {
	const globalData = [];
	for (let i = 0, arrSize = arr.length; i < arrSize; i++) {
		globalData.push(customReadFile(arr[i]));
	}
	const readGlobalData = await Promise.all(globalData);
	return arr.map((file, index) => {
		const obj = {};
		console.log(boldString('compile data:'), shortenPath(file));
		obj[basename(file, extname(file))] = safeLoad(readGlobalData[index]);
		return obj;
	});
}

async function getGlobalData(data) {
	if (Array.isArray(data)) {
		return data.length ? Object.assign({}, ...await processGlobalData(data)) : {};
	}
	console.log(boldString('compile data:'), shortenPath(data));
	GLOBAL_DATA[basename(data, extname(data))] = safeLoad(await customReadFile(data));
	return GLOBAL_DATA;
}

function compileTemplate(filePath, globalData = GLOBAL_DATA, blocks = BLOCKS, commons = COMMONS) {
	const extractedData = loadFront(filePath, '\/\/---', 'content');
	const modifiedExtractedData = Object.assign({}, extractedData);
	delete modifiedExtractedData.layout;
	delete modifiedExtractedData.content;
	const extractedDataLayout = extractedData.layout;
	const layoutIndex = extractedDataLayout ? LAYOUTS.findIndex(item => item.indexOf(normalize(extractedDataLayout)) > -1) : -1;
	if (layoutIndex > -1) {
		const layout = LAYOUTS[layoutIndex];
		const fnLayout = compileFile( layout, {
			compileDebug: true,
			inlineRuntimeFunctions: true,
			plugins: [
				{
					preLex: function(fileSource, someOpts) {
						const extendsReg = /^extends/;
						const rootReg = /\/layouts\/root\.?(pug|jade)/;
						if (rootReg.test(someOpts.filename) || !extendsReg.test(fileSource)) {
							console.log('Hello from preLex plugin: ', someOpts.filename);
							return `${commons}\n${bemto}\n${fileSource}`;
						}
						return fileSource;
					}
				}
			]
		});
		siteGridEngine(
			extractedData.title,
			filePath,
			extname(extractedDataLayout).length ? extractedDataLayout : `${extractedDataLayout}${extname(layout)}`
		);
		templateDependenciesEngine(
			layout,
			fnLayout.dependencies.filter(item => item.indexOf(normalize('/layouts/')) > -1),
			filePath
		);
		const initialLocals = {
			NODE_ENV: process.env.NODE_ENV,
			renderBlock: function renderBlockEngine(blockName, data) {
				data.renderBlock = function (blockName, data) {
					return renderBlockEngine(blockName, data);
				};
				return compileBlock(bemto, blockName[0], blocks, commons)(data);
			},
			file: modifiedExtractedData,
			includes: `${commons}\n${bemto}\n`,
			commons: commons,
			bemto: bemto,
			content: (function () {
				const fn = compile(`${commons}\n${bemto}\n${extractedData.content}`, { compileDebug: true });
				const initialLocals = {
					renderBlock: function renderBlockEngine(blockName, data) {
						data.renderBlock = function (blockName, data) {
							return renderBlockEngine(blockName, data);
						};
						return compileBlock(bemto, blockName[0], blocks, commons)(data);
					}
				};
				const locals = Object.assign({}, initialLocals, modifiedExtractedData, globalData);
				return fn(locals);
			})()
		};
		const locals = Object.assign({}, initialLocals, globalData);
		console.log(boldString('compile branch:'), shortenPath(filePath));
		return {
			filename: `${basename(filePath, extname(filePath))}.html`,
			from: SOURCE_DIRECTORY,
			to: PAGES_DIRECTORY,
			content: fnLayout(locals)
		};
	}
	console.log(boldString('compile branch {}:'), shortenPath(filePath));
	return {};
}

async function initTemplateEngine(cb) {
	try {
		await removeDirectory(PROD_OUTPUT_DIRECTORY);
		await removeDirectory(PAGES_DIRECTORY);
		await createDirectory(PAGES_DIRECTORY);
		TEMPLATES = await getFiles(`${PROJECT_ROOT}/src/*.?(pug|jade)`);
		TEMPLATES_GRID = await getFiles(`${PROJECT_ROOT}/src/sitegrid.?(pug|jade)`, 0);
		TEMPLATES_NO_GRID = TEMPLATES_GRID ? await getFiles(`${PROJECT_ROOT}/src/!(sitegrid).?(pug|jade)`) : TEMPLATES.slice();
		TEMPLATES_NO_GRID_SIZE = TEMPLATES_NO_GRID.length;
		LAYOUTS = await getFiles(`${PROJECT_ROOT}/src/layouts/*.?(pug|jade)`);
		BLOCKS = await getFiles(`${PROJECT_ROOT}/src/blocks/**/*.?(pug|jade)`);
		GLOBAL_DATA = await getGlobalData(await getFiles(`${PROJECT_ROOT}/src/data/*.?(yml|yaml)`));
		COMMONS = await customReadFile(await getFiles(`${PROJECT_ROOT}/src/globals/commons.?(pug|jade)`, 0));
		EMAILS = await getFiles(`${PROJECT_ROOT}/src/emails/**/*.?(pug|jade|html|mjml)`);
		EMAILS_SIZE = EMAILS.length;
		const renderTemplates = [];
		const compileTemplates = [];
		if (process.env.SOURCEMAP) {
			SITE_GRID.push({
				title: BUNDLE_STATISTICS.title,
				url: BUNDLE_STATISTICS.url,
				layout: null
			});
		}
		for (let i = 0; i < TEMPLATES_NO_GRID_SIZE; i++) {
			compileTemplates.push(compileTemplate(TEMPLATES_NO_GRID[i]));
		}
		if (pathExistsSync(EMAILS_DIRECTORY)) {
			for (let i = 0; i < EMAILS_SIZE; i++) {
				compileTemplates.push(compileEmailTemplate(EMAILS[i]));
			}
		}
		if (TEMPLATES_GRID) {
			compileTemplates.push(compileSiteGrid(TEMPLATES_GRID));
		}
		for (let i = 0, compileTemplatesSize = compileTemplates.length; i < compileTemplatesSize; i++) {
			renderTemplates.push(renderTemplate(compileTemplates[i], compileTemplates[i].to));
		}
		await Promise.all(renderTemplates);
		if (cb) {
			cb(TEMPLATES_NO_GRID, TEMPLATES_NO_GRID_SIZE, GLOBAL_DATA);
		}
	} catch (error) {
		if (error.src) delete error.src;
		if (error.mark) delete error.mark;
		console.log(boldString(redString('error:')), error);
	}
}

function addHtmlWebpackPlugins() {
	return glob.sync(`${PROJECT_ROOT}/src/pages/**/*.html`).map((item) => {
		let filename = basename(item);
		let inject;
		if (filename === 'sitegrid.html') {
			inject = false;
		} else {
			if (item.indexOf('/emails/') > -1) {
				inject = false;
				filename = item.replace(`${toUNIXPath(PAGES_DIRECTORY)}/`, '');
			} else {
				inject = 'body';
			}
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
	OUTPUT_DIRECTORY,
	SOURCE_DIRECTORY,
	PAGES_DIRECTORY,
	BUNDLE_STATISTICS,
	EMAILS_DIRECTORY,
	SUPPORTED_BROWSERS_LIST,
	POSTCSS_CONFIG,
	ASSETS_NAMING_CONVENTION,
	initTemplateEngine,
	customReadFile,
	getFiles,
	generateEntry,
	getGlobalData,
	boldString,
	redString,
	addBlockToTemplateBranch,
	changeFileTimestamp,
	shortenPath,
	getTemplateBranches,
	renderTemplate,
	compileTemplate,
	compileEmailTemplate,
	getModifiedNib,
	addHtmlWebpackPlugins
};
