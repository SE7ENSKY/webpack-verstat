const supportsColor = require('supports-color');
const chalk = require('chalk');
const {
	resolve,
	extname,
	basename,
	dirname,
	sep,
	join,
	isAbsolute
} = require('path');
const { safeLoad } = require('js-yaml');
const pretty = require('pretty');
const { loadFront } = require('verstat-front-matter');
const {
	readFileSync,
	readdirSync,
	writeFileSync,
	rmdirSync,
	mkdirSync,
	existsSync,
	unlinkSync,
	utimesSync
} = require('fs');
const { watch } = require('chokidar');
const { sync } = require('glob');
const {
	compile,
	compileFile
} = require('pug');
const bemto = require('verstat-bemto/index-tabs');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// TODO cross-platform paths
// TODO throttle/debounce webpack, browsersync, templates
// TODO minimize webpack output
// TODO [!] standalone markdown
// TODO happypack
// TODO update readme.md
// TODO [!] letters: html/css, pug/stylus, mjml
// TODO pug markdown: jstransformer-markdown-it (https://pugjs.org/language/filters.html)
// TODO pug babel: jstransformer-babel (https://pugjs.org/language/filters.html)
// TODO [!] server errors/adjacent folders
// TODO watching files on older versions of Windows, Ubuntu, Vagrant, and Docker
// TODO smartcache
// TODO web workers ?
// TODO service worker ?

// ---------- Constants ----------
const PROJECT_ROOT = resolve(__dirname, '../');

const PROD_OUTPUT = join(PROJECT_ROOT, 'dist');

const DEV_OUTPUT = '/';

const TEMPLATE_DEPENDENCIES = new Map();

let TEMPLATE_DEPENDENCIES_KEY;

const SITE_GRID = [];

const SUPPORTED_BROWSERS_LIST = [
	'last 4 versions',
	'ie >= 10'
];

const CSS_NANO_BASE_CONFIG = {
	autoprefixer: false,
	rawCache: true,
	calc: false,
	colormin: false,
	convertValues: false,
	discardComments: false,
	discardDuplicates: true,
	discardEmpty: true,
	discardOverridden: false,
	discardUnused: false,
	mergeIdents: false,
	mergeLonghand: false,
	mergeRules: true,
	minifyFontValues: {
		removeAfterKeyword: false,
		removeDuplicates: true,
		removeQuotes: false
	},
	minifyGradients: false,
	minifyParams: false,
	minifySelectors: false,
	normalizeCharset: false,
	normalizeDisplayValues: false,
	normalizePositions: false,
	normalizeRepeatStyle: false,
	normalizeString: false,
	normalizeTimingFunctions: false,
	normalizeUnicode: false,
	normalizeUrl: false,
	normalizeWhitespace: false,
	orderedValues: true,
	reduceIdents: false,
	reduceInitial: false,
	reduceTransforms: false,
	svgo: false,
	uniqueSelectors: true,
	zindex: false
};

const CSS_NANO_MINIMIZE_CONFIG = {
	discardComments: {
		removeAll: true
	},
	normalizeWhitespace: true
};

const PERFECTIONIST_CONFIG = {
	cascade: true,
	colorCase: 'lower',
	colorShorthand: false,
	format: 'expanded',
	indentChar: ' ',
	indentSize: 2,
	trimLeadingZero: false,
	trimTrailingZeros: true,
	maxAtRuleLength: false,
	maxSelectorLength: 1,
	maxValueLength: false,
	sourcemap: false,
	zeroLengthNoUnit: true
};
// ---------- Constants ----------

function isString(str) {
	return typeof str === 'string' || str instanceof String;
}

function generateEntry(server) {
	const entry = sync(`${PROJECT_ROOT}/src/assets/*.js`);
	if (entry.length) {
		const obj = {};
		const file = entry[0];
		const objProp = basename(file, '.js');
		obj[objProp] = [file.replace(`${PROJECT_ROOT}/src`, '.')];
		if (isString(server)) obj[objProp].push(server);
		return obj;
	}
	return null;
}

function gererateVendor() {
	const vendor = sync(`${PROJECT_ROOT}/src/assets/*.js`);
	if (vendor.length) return `${basename(vendor[0], '.js')}.vendor`;
	return 'vendor';
}

function shortenAbsolutePath(absolutePath) {
	if (isAbsolute(absolutePath)) {
		const rootPathParts = PROJECT_ROOT.split(sep);
		return `${rootPathParts[rootPathParts.length - 1]}${absolutePath.replace(PROJECT_ROOT, '')}`;
	}
	return absolutePath;
}

function prettifyHTML(str, options) {
	if (isString(str)) {
		const defaultOptions = {
			ocd: true,
			indent_char: '\t',
			indent_size: 1
		};
		return pretty(str, options ? Object.assign(defaultOptions, options) : defaultOptions);
	}
}

function boldTerminalString(str) {
	if (isString(str)) {
		if (supportsColor) return chalk.bold(str);
		return str;
	}
}

function readFile(file) {
	return readFileSync(file, { encoding: 'utf8' });
}

function createDirectory(path, fileSystem) {
	if (isString(path)) {
		let filePathParts;
		if (extname(path) !== '') {
			filePathParts = dirname(path).split(sep).filter(item => item !== '');
		} else {
			filePathParts = path.split(sep).filter(item => item !== '');
		}
		if (filePathParts.length) {
			let dirPath = '';
			if (fileSystem) {
				filePathParts.forEach(function (item, index) {
					if (fileSystem.readdirSync(index === 0 ? DEV_OUTPUT : dirPath).indexOf(filePathParts[index]) === -1) {
						dirPath += `${sep}${filePathParts[index]}`;
						fileSystem.mkdirpSync(dirPath);
					} else {
						dirPath += `${sep}${filePathParts[index]}`;
					}
				});
			} else {
				filePathParts.forEach(function (item, index) {
					if (readdirSync(index === 0 ? DEV_OUTPUT : dirPath).indexOf(filePathParts[index]) === -1) {
						dirPath += `${sep}${filePathParts[index]}`;
						mkdirSync(dirPath);
					} else {
						dirPath += `${sep}${filePathParts[index]}`;
					}
				});
			}
		}
	}
}

function writeFileToDirectory(file, fileContent, fileSystem, command) {
	if (isString(file) && isString(fileContent)) {
		const filePath = file.replace(join(PROJECT_ROOT, 'src'), '');
		if (fileContent !== '') {
			createDirectory(filePath, fileSystem);
			if (fileSystem) {
				fileSystem.writeFileSync(filePath, fileContent);
			} else {
				writeFileSync(filePath, fileContent);
			}
			console.log(boldTerminalString(`${command}:`), shortenAbsolutePath(file).replace('src', 'dist'));
		}
	}
}

function extractTitleFromHTML(fileContent, openTag = '<title>', closeTag = '</title>') {
	if (isString(fileContent) && isString(openTag) && isString(closeTag)) {
		return fileContent.split(openTag).pop().split(closeTag).shift();
	}
}

function getModifiedNib(path) {
	const dirPath = dirname(path);
	if (readFile(path).indexOf('path: fallback') !== -1) {
		return join(dirPath, 'nib-mod-fallback.styl');
	}
	return join(dirPath, 'nib-mod.styl');
}

function handleAdjacentFile(file, fileContent, fileSystem, compiler, command, mode) {
	// FIXME redundancy
	if (mode === 'init') {
		if (fileSystem) {
			compiler.plugin('after-emit', function (compilation, callback) {
				writeFileToDirectory(file, fileContent, fileSystem, command);
				callback();
			});
		} else {
			writeFileToDirectory(file, fileContent, fileSystem, command);
		}
	} else if (mode === 'watch') {
		writeFileToDirectory(file, fileContent, fileSystem, command);
	}
}

function handleAdjacentAsset(path, fileSystem, compiler, command, mode) {
	switch (command) {
		case 'addDir':
			if (fileSystem) {
				compiler.plugin('after-emit', function (compilation, callback) {
					createDirectory(path, fileSystem);
					callback();
				});
			} else {
				createDirectory(path);
			}
			break;
		case 'unlinkDir':
			if (fileSystem) {
				compiler.plugin('after-emit', function (compilation, callback) {
					fileSystem.rmdirSync(path);
					callback();
				});
			} else {
				rmdirSync(path);
			}
			break;
		case 'unlink':
			if (fileSystem) {
				compiler.plugin('after-emit', function (compilation, callback) {
					fileSystem.unlinkSync(path);
					console.log(boldTerminalString(`${command}:`), shortenAbsolutePath(path).replace('src', 'dist'));
					callback();
				});
			} else {
				unlinkSync(path);
				console.log(boldTerminalString(`${command}:`), shortenAbsolutePath(path).replace('src', 'dist'));
			}
			break;
		case 'add':
		case 'change':
			if (fileSystem) {
				compiler.plugin('after-emit', function (compilation, callback) {
					writeFileToDirectory(path, readFile(path), fileSystem, command);
					callback();
				});
			} else {
				writeFileToDirectory(path, readFile(path), fileSystem, command);
			}
			break;
	}
}

function handleAdjacentHTML(file, fileContent, fileSystem, compiler, command, mode) {
	if (isString(file)) {
		let content;
		if (isString(fileContent)) {
			content = fileContent;
		} else {
			content = readFile(file); // TODO autoprefixer inline css, uglify/prettify
		}
		if (content !== '') {
			siteGridEngine(extractTitleFromHTML(content), file, file);
			handleAdjacentFile(file, content, fileSystem, compiler, command, mode);
		}
	}
}

function handleAdjacentTemplate(file, fileSystem, compiler, command, mode) {}
function handleAdjacentMJML(file, fileSystem, compiler, command, mode) {}
function handleAdjacentMarkdown(file, fileSystem, compiler, command, mode) {}
function handleAdjacentStylus(file, fileSystem, compiler, command, mode) {}

function handleAdjacentCSS(file, fileContent, fileSystem, compiler, command, mode) {
	if (isString(file)) {
		let content;
		if (isString(fileContent)) {
			content = fileContent;
		} else {
			content = readFile(file); // TODO autoprefixer inline css, uglify/prettify
		}
		if (content !== '') {
			handleAdjacentFile(file, content, fileSystem, compiler, command, mode);
		}
	}
}

function adjacentFoldersRouter(file, fileSystem, compiler, command, mode = 'watch') {
	switch (command) {
		case 'add':
		case 'change':
			switch (extname(file)) {
				case '.html':
					handleAdjacentHTML(file, undefined, fileSystem, compiler, command, mode);
					break;
				case '.jade':
				case '.pug':
					handleAdjacentTemplate(file, fileSystem, compiler, command, mode);
					break;
				case '.mjml':
					handleAdjacentMJML(file, fileSystem, compiler, command, mode);
					break;
				case '.md':
					handleAdjacentMarkdown(file, fileSystem, compiler, command, mode);
					break;
				case '.styl':
					handleAdjacentStylus(file, fileSystem, compiler, command, mode);
					break;
				case '.css':
					handleAdjacentCSS(file, undefined, fileSystem, compiler, command, mode);
					break;
				default:
					handleAdjacentAsset(file, fileSystem, compiler, command, mode);
			}
			break;
		case 'addDir':
		case 'unlinkDir':
		case 'unlink':
			handleAdjacentAsset(file, fileSystem, compiler, command, mode);
			break;
	}
}

function watchAdjacentFolders(warchPath) {
	if (isString(warchPath)) {
		watch // 'chokidar' { ignoreInitial: true, awaitWriteFinish: true }
	}
	// adjacentFoldersRouter(file, fileSystem);
	// siteGridEngine(title, url, layout)
}

function initAdjacentFolders(outputPath, outputFileSystem, compiler, ignoreFolders) {
	if (isString(outputPath) && ignoreFolders.every(item => isString(item))) {
		const folders = ignoreFolders.join().replace(/,/g, '|');
		const files = sync(`${PROJECT_ROOT}/src/!(${folders})/**/*.*`);
		files.forEach(file => adjacentFoldersRouter(file, outputFileSystem, compiler, 'add', 'init'));
		// if (outputFileSystem) watchAdjacentFolders(files);
	}
}

function siteGridEngine(title, url, layout) {
	SITE_GRID.push({
		title: title || null,
		url: url.replace(`${PROJECT_ROOT}/src`, '').replace(extname(url), '.html'),
		layout: layout.replace(`${PROJECT_ROOT}/src/`, '')
	});
}

function compileSiteGrid(template) {
	const fn = compileFile(template);
	const locals = { siteGrid: SITE_GRID };
	return {
		filename: `${basename(template, extname(template))}.html`,
		content: prettifyHTML(fn(locals))
	};
}

function compileBlock(mod, block) {
	const blocks = sync(`${PROJECT_ROOT}/src/blocks/**/*.?(pug|jade)`);
	const index = blocks.findIndex(item => item.indexOf(block) !== -1);
	if (index !== -1) {
		const blockPath = blocks[index];
		TEMPLATE_DEPENDENCIES.get(TEMPLATE_DEPENDENCIES_KEY).blocks.set(block, blockPath);
		return compile(`${mod}\n${readFile(blockPath)}`);
	}
	TEMPLATE_DEPENDENCIES.get(TEMPLATE_DEPENDENCIES_KEY).blocks.set(block, null);
	return compile(`div [block ${block} not found]`);
}

function renderBlockEngine(blockName, data) {
	data.renderBlock = function (blockName, data) {
		return compileBlock(bemto, blockName[0])(data);
	};
	return compileBlock(bemto, blockName[0])(data);
}

function getGlobalData() {
	const data = sync(`${PROJECT_ROOT}/src/data/*.yml`).map((file) => {
		const obj = {};
		obj[basename(file, '.yml')] = safeLoad(readFile(file));
		return obj;
	});
	return data.length ? Object.assign({}, ...data) : {};
}

function templateDependenciesEngine(template, data) {
	const fileExt = extname(data);
	const key = `${basename(data, fileExt)}${fileExt}`;
	TEMPLATE_DEPENDENCIES_KEY = key;
	TEMPLATE_DEPENDENCIES.set(
		key,
		{
			file: data,
			layout: template,
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

function getTemplateBranch(templateWithData, template, block) {
	const branch = [];
	if (TEMPLATE_DEPENDENCIES.size) {
		for (const [key, value] of TEMPLATE_DEPENDENCIES) {
			const { file, layout, blocks } = value;
			if (file === templateWithData || layout === template) {
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

function compileTemplate(templateWithData) {
	const extractedData = loadFront(templateWithData, '\/\/---', 'content');
	const modifiedExtractedData = Object.assign({}, extractedData);
	delete modifiedExtractedData.layout;
	delete modifiedExtractedData.content;
	const layouts = sync(`${PROJECT_ROOT}/src/layouts/*.?(pug|jade)`);
	const template = layouts.filter(layout => layout.indexOf(extractedData.layout) !== -1);
	if (template.length) {
		siteGridEngine(
			extractedData.title,
			templateWithData,
			extname(extractedData.layout) ? extractedData.layout : `${extractedData.layout}${extname(template[0])}`
		);
		templateDependenciesEngine(template[0], templateWithData);
		const fn = compileFile(template[0]);
		const initialLocals = {
			renderBlock: renderBlockEngine,
			file: modifiedExtractedData,
			content: (function () {
				const fn = compile(`${bemto}\n${extractedData.content}`);
				const initialLocals = { renderBlock: renderBlockEngine };
				const locals = Object.assign(initialLocals, modifiedExtractedData, getGlobalData());
				return fn(locals);
			})()
		};
		const locals = Object.assign(initialLocals, getGlobalData());
		return {
			filename: `${basename(templateWithData, extname(templateWithData))}.html`,
			content: prettifyHTML(fn(locals))
		};
	}
	return {};
}

function removeFiles(files) {
	if (files.length) {
		files.forEach(function (item) {
			if (existsSync(item)) {
				unlinkSync(item);
				console.log(boldTerminalString('unlink old:'), shortenAbsolutePath(item));
			}
		});
	}
}

function changeFileTimestamp(number, path) {
	if (existsSync(path)) {
		const modifier = parseInt(number);
		if (modifier < 0) {
			const timeThen = (Date.now() / 1000) - Math.abs(modifier);
			utimesSync(path, timeThen, timeThen);
		} else if (modifier > 0) {
			const timeThen = (Date.now() / 1000) + Math.abs(modifier);
			utimesSync(path, timeThen, timeThen);
		}
	}
}

function renderTemplate(templateData) {
	if (Object.keys(templateData).length !== 0) {
		const path = join(PROJECT_ROOT, 'src', 'pages', templateData.filename);
		writeFileSync(path, templateData.content, 'utf-8');
		changeFileTimestamp(-10, path);
		console.log(boldTerminalString('add:'), shortenAbsolutePath(path));
	}
}

function initHtmlWebpackPlugin(outputPath, outputFileSystem, compiler) {
	const pagesDirectory = `${PROJECT_ROOT}/src/pages/`;
	const pages = `${pagesDirectory}*.html`;

	if (!existsSync(pagesDirectory)) createDirectory(pagesDirectory);

	removeFiles(sync(pages));

	sync(`${PROJECT_ROOT}/src/!(sitegrid).?(pug|jade)`).forEach(function (item) {
		renderTemplate(compileTemplate(item));
	});

	initAdjacentFolders(
		outputPath,
		outputFileSystem,
		compiler,
		[
			'assets',
			'blocks',
			'data',
			'globals',
			'layouts',
			'pages',
			'vendor'
		]
	);

	sync(`${PROJECT_ROOT}/src/sitegrid.?(pug|jade)`).forEach(function (item) {
		renderTemplate(compileSiteGrid(item));
	});

	return sync(pages).map(function (item) {
		const filename = basename(item);
		let inject;
		switch (filename) {
			case 'styles.html':
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
			minify: {
				removeComments: true
			}
		});
	});
}

module.exports = {
	PROJECT_ROOT,
	PROD_OUTPUT,
	DEV_OUTPUT,
	SUPPORTED_BROWSERS_LIST,
	CSS_NANO_BASE_CONFIG,
	CSS_NANO_MINIMIZE_CONFIG,
	PERFECTIONIST_CONFIG,
	readFile,
	generateEntry,
	gererateVendor,
	boldTerminalString,
	addBlockToTemplateBranch,
	changeFileTimestamp,
	shortenAbsolutePath,
	getTemplateBranch,
	renderTemplate,
	compileTemplate,
	getModifiedNib,
	initHtmlWebpackPlugin
};
