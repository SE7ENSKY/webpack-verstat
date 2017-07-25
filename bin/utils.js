const supportsColor = require('supports-color');
const chalk = require('chalk');
const { mjml2html } = require('mjml');
const stylus = require('stylus');
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
// TODO smartcache
// TODO throttle/debounce webpack, browsersync, templates
// TODO minimize webpack output
// TODO happypack
// TODO update readme.md

// TODO pug markdown: jstransformer-markdown-it (https://pugjs.org/language/filters.html)
// TODO pug babel: jstransformer-babel (https://pugjs.org/language/filters.html)
// TODO watching files on older versions of Windows, Ubuntu, Vagrant, and Docker
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

function handleAdjacentAsset(path, fileSystem, compiler, browserSync, command, mode) {
	switch (command) {
		case 'addDir':
			if (mode === 'init') {
				if (fileSystem) {
					compiler.plugin('after-emit', function (compilation, callback) {
						createDirectory(path, fileSystem);
						callback();
					});
				} else {
					createDirectory(path, fileSystem);
				}
			} else if (mode === 'watch') {
				createDirectory(path, fileSystem);
			}
			break;
		case 'unlinkDir':
			if (mode === 'init') {
				if (fileSystem) {
					compiler.plugin('after-emit', function (compilation, callback) {
						fileSystem.rmdirSync(path);
						if (browserSync) browserSync.reload();
						callback();
					});
				} else {
					rmdirSync(path);
					if (browserSync) browserSync.reload();
				}
			} else if (mode === 'watch') {
				if (fileSystem) {
					fileSystem.rmdirSync(path);
					if (browserSync) browserSync.reload();
				} else {
					rmdirSync(path);
					if (browserSync) if (browserSync) browserSync.reload();
				}
			}
			break;
		case 'unlink':
			if (mode === 'init') {
				if (fileSystem) {
					compiler.plugin('after-emit', function (compilation, callback) {
						fileSystem.unlinkSync(path);
						if (browserSync) browserSync.reload();
						console.log(boldTerminalString(`${command}:`), shortenAbsolutePath(path).replace('src', 'dist'));
						callback();
					});
				} else {
					unlinkSync(path);
					if (browserSync) browserSync.reload();
					console.log(boldTerminalString(`${command}:`), shortenAbsolutePath(path).replace('src', 'dist'));
				}
			} else if (mode === 'watch') {
				if (fileSystem) {
					fileSystem.unlinkSync(path);
					if (browserSync) browserSync.reload();
					console.log(boldTerminalString(`${command}:`), shortenAbsolutePath(path).replace('src', 'dist'));
				} else {
					unlinkSync(path);
					if (browserSync) browserSync.reload();
					console.log(boldTerminalString(`${command}:`), shortenAbsolutePath(path).replace('src', 'dist'));
				}
			}
			break;
		case 'add':
		case 'change':
			if (mode === 'init') {
				if (fileSystem) {
					compiler.plugin('after-emit', function (compilation, callback) {
						writeFileToDirectory(path, readFile(path), fileSystem, command);
						if (browserSync) browserSync.reload();
						console.log(boldTerminalString(`${command}:`), shortenAbsolutePath(path).replace('src', 'dist'));
						callback();
					});
				} else {
					writeFileToDirectory(path, readFile(path), fileSystem, command);
					console.log(boldTerminalString(`${command}:`), shortenAbsolutePath(path).replace('src', 'dist'));
					if (browserSync) browserSync.reload();
				}
			} else if (mode === 'watch') {
				writeFileToDirectory(path, readFile(path), fileSystem, command);
				console.log(boldTerminalString(`${command}:`), shortenAbsolutePath(path).replace('src', 'dist'));
				if (browserSync) browserSync.reload();
			}
			break;
	}
}

function handleAdjacentHTML(file, fileContent, fileSystem, compiler, browserSync, command, mode) {
	if (isString(file)) {
		let content;
		if (isString(fileContent)) {
			content = fileContent;
		} else {
			content = readFile(file);
		}
		if (content !== '') {
			// content // TODO autoprefixer inline css, uglify/prettify
			// process.env.UGLIFY
			handleAdjacentFile(file, content, fileSystem, compiler, command, mode);
			siteGridEngine(extractTitleFromHTML(content), file, file);
			sync(`${PROJECT_ROOT}/src/sitegrid.?(pug|jade)`).forEach(function (item) {
				renderTemplate(compileSiteGrid(item));
			});
			if (browserSync) browserSync.reload();
		}
	}
}

function handleAdjacentTemplate(file, fileSystem, compiler, browserSync, command, mode) {
	const content = readFile(file);
	if (content !== '') {
		const fn = compile(content);
		const locals = {};
		handleAdjacentHTML(file.replace(extname(file), '.html'), fn(locals), fileSystem, compiler, browserSync, command, mode);
	}
}

function handleAdjacentMJML(file, fileSystem, compiler, browserSync, command, mode) {
	const content = readFile(file);
	if (content !== '') {
		const { error, html } = mjml2html(content);
		if (!error) {
			handleAdjacentHTML(file.replace(extname(file), '.html'), html, fileSystem, compiler, browserSync, command, mode);
		} else {
			console.log(error);
		}
	}
}

// TODO standalone markdown
function handleAdjacentMarkdown(file, fileSystem, compiler, browserSync, command, mode) {}

function handleAdjacentStylus(file, fileSystem, compiler, browserSync, command, mode) {
	const content = readFile(file);
	if (content !== '') {
		stylus(content)
			.render(function (err, css) {
				if (err) throw err;
				handleAdjacentCSS(file.replace(extname(file), '.css'), css, fileSystem, compiler, browserSync, command, mode);
			});
	}
}

function handleAdjacentCSS(file, fileContent, fileSystem, compiler, browserSync, command, mode) {
	if (isString(file)) {
		let content;
		if (isString(fileContent)) {
			content = fileContent;
		} else {
			content = readFile(file);
		}
		if (content !== '') {
			// content // TODO autoprefixer inline css, uglify/prettify
			// process.env.UGLIFY
			handleAdjacentFile(file, content, fileSystem, compiler, browserSync, command, mode);
			if (browserSync) browserSync.reload();
		}
	}
}

function adjacentDirectoriesRouter(file, fileSystem, compiler, browserSync, command, mode) {
	switch (command) {
		case 'add':
		case 'change':
			switch (extname(file)) {
				case '.html':
					handleAdjacentHTML(file, undefined, fileSystem, compiler, browserSync, command, mode);
					break;
				case '.jade':
				case '.pug':
					handleAdjacentTemplate(file, fileSystem, compiler, browserSync, command, mode);
					break;
				case '.mjml':
					handleAdjacentMJML(file, fileSystem, compiler, browserSync, command, mode);
					break;
				case '.md':
					handleAdjacentMarkdown(file, fileSystem, compiler, browserSync, command, mode);
					break;
				case '.styl':
					handleAdjacentStylus(file, fileSystem, compiler, browserSync, command, mode);
					break;
				case '.css':
					handleAdjacentCSS(file, undefined, fileSystem, compiler, browserSync, command, mode);
					break;
				default:
					handleAdjacentAsset(file, fileSystem, compiler, browserSync, command, mode);
			}
			break;
		case 'addDir':
		case 'unlinkDir':
		case 'unlink':
			handleAdjacentAsset(file, fileSystem, compiler, browserSync, command, mode);
			break;
	}
}

function watchadjacentDirectories(warchPath, fileSystem, compiler, browserSync) {
	if (Array.isArray(warchPath) && warchPath.length) {
		watch(
			warchPath,
			{
				ignoreInitial: true,
				awaitWriteFinish: true,
				usePolling: true
			}
		)
		.on('add', path => adjacentDirectoriesRouter(path, fileSystem, compiler, browserSync, 'add', 'watch'))
		.on('change', path => adjacentDirectoriesRouter(path, fileSystem, compiler, browserSync, 'change', 'watch'))
		.on('unlink', path => adjacentDirectoriesRouter(path, fileSystem, compiler, browserSync, 'unlink', 'watch'))
		.on('addDir', path => adjacentDirectoriesRouter(path, fileSystem, compiler, browserSync, 'addDir', 'watch'))
		.on('unlinkDir', path => adjacentDirectoriesRouter(path, fileSystem, compiler, browserSync, 'unlinkDir', 'watch'));
	}
}

function initAdjacentDirectories(outputPath, outputFileSystem, compiler, browserSync, ignoreFolders) {
	if (isString(outputPath) && ignoreFolders.every(item => isString(item))) {
		const folders = ignoreFolders.join().replace(/,/g, '|');
		const files = sync(`${PROJECT_ROOT}/src/!(${folders})/**/*.*`);
		files.forEach(file => adjacentDirectoriesRouter(file, outputFileSystem, compiler, browserSync, 'add', 'init'));
		if (outputFileSystem) watchadjacentDirectories(files, outputFileSystem, compiler, browserSync);
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

function initHtmlWebpackPlugin(outputPath, outputFileSystem, compiler, browserSync) {
	const pagesDirectory = `${PROJECT_ROOT}/src/pages/`;
	const pages = `${pagesDirectory}*.html`;

	if (!existsSync(pagesDirectory)) createDirectory(pagesDirectory);

	removeFiles(sync(pages));

	sync(`${PROJECT_ROOT}/src/!(sitegrid).?(pug|jade)`).forEach(function (item) {
		renderTemplate(compileTemplate(item));
	});

	initAdjacentDirectories(
		outputPath,
		outputFileSystem,
		compiler,
		browserSync,
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
