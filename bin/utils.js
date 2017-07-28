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
	lstatSync,
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
const OUTPUT_DIRECTORY = 'dist';
const MEMORY_DIRECTORY = 'memory-fs';
const PROD_OUTPUT = join(PROJECT_ROOT, OUTPUT_DIRECTORY);
let ADJACENT_DIRECTORIES_MODE;
const DEV_OUTPUT = sep; // /
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
		obj[objProp] = [file.replace(join(PROJECT_ROOT, 'src'), '.')];
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

function customReadFile(file, encoding = 'utf8') {
	return readFileSync(file, { encoding });
}

function removeDirectory(path) {
	if (existsSync(path)) {
		readdirSync(path).forEach(function (file, index) {
			const currentPath = join(path, file);
			if (lstatSync(currentPath).isDirectory()) {
				removeDirectory(currentPath);
			} else {
				unlinkSync(currentPath);
			}
		});
		rmdirSync(path);
	}
}

function createDirectory(path, fileSystem) {
	if (isString(path)) {
		let filePathParts;
		const shortPath = path.replace(PROJECT_ROOT, '');
		if (extname(shortPath) !== '') {
			filePathParts = dirname(shortPath).split(sep).filter(item => item !== '');
		} else {
			filePathParts = shortPath.split(sep).filter(item => item !== '');
		}
		if (filePathParts.length) {
			let dirPath = '';
			if (fileSystem) {
				filePathParts.forEach(function (item, index) {
					if (fileSystem.readdirSync(index === 0 ? DEV_OUTPUT : dirPath).indexOf(filePathParts[index]) === -1) {
						dirPath += `${sep}${filePathParts[index]}`;
						fileSystem.mkdirpSync(dirPath);
						console.log(
							boldTerminalString('addDir:'),
							shortenAbsolutePath(join(PROJECT_ROOT, MEMORY_DIRECTORY, dirPath))
						);
					} else {
						dirPath += `${sep}${filePathParts[index]}`;
					}
				});
			} else {
				dirPath = PROJECT_ROOT;
				filePathParts.forEach(function (item, index) {
					if (readdirSync(dirPath).indexOf(filePathParts[index]) === -1) {
						dirPath += `${sep}${filePathParts[index]}`;
						mkdirSync(dirPath);
						const shortenPath = shortenAbsolutePath(dirPath);
						if (shortenPath.indexOf('pages') !== -1) {
							console.log(boldTerminalString('addDir:'), shortenPath);
						} else {
							console.log(boldTerminalString('addDir:'), shortenPath.replace('src', OUTPUT_DIRECTORY));
						}
					} else {
						dirPath += `${sep}${filePathParts[index]}`;
					}
				});
			}
		}
	}
}

function writeFileToDirectory(file, fileContent, fileSystem, event) {
	if (isString(file)) {
		const filePath = file.replace(join(PROJECT_ROOT, 'src'), fileSystem ? '' : OUTPUT_DIRECTORY);
		if (fileContent.length) {
			createDirectory(filePath, fileSystem);
			if (fileSystem) {
				fileSystem.writeFileSync(filePath, fileContent);
				console.log(
					boldTerminalString(`${event}:`),
					shortenAbsolutePath(file).replace('src', MEMORY_DIRECTORY)
				);
			} else {
				writeFileSync(filePath, fileContent);
				console.log(
					boldTerminalString(`${event}:`),
					shortenAbsolutePath(file).replace('src', OUTPUT_DIRECTORY)
				);
			}
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
	if (customReadFile(path).indexOf('path: fallback') !== -1) {
		return join(dirPath, 'nib-mod-fallback.styl');
	}
	return join(dirPath, 'nib-mod.styl');
}

function handleAdjacentFile(file, fileContent, fileSystem, compiler, event, mode) {
	switch (mode) {
	case 'init':
		if (fileSystem) {
			compiler.plugin('after-emit', function (compilation, callback) {
				if (ADJACENT_DIRECTORIES_MODE !== 'watch') writeFileToDirectory(file, fileContent, fileSystem, event);
				callback();
			});
		} else {
			const timerId = setTimeout(function waitForOutputDirectory() {
				if (!existsSync(PROD_OUTPUT)) {
					setTimeout(waitForOutputDirectory, 100);
				} else {
					writeFileToDirectory(file, fileContent, fileSystem, event);
				}
			}, 100);
		}
		break;
	case 'watch':
		writeFileToDirectory(file, fileContent, fileSystem, event);
		break;
	}
}

function handleAdjacentAsset(path, fileSystem, compiler, browserSync, event, mode) {
	const pathExtension = extname(path);
	switch (event) {
	case 'addDir':
		if (mode === 'watch') {
			createDirectory(path, fileSystem);
			if (browserSync) browserSync.reload();
		}
		break;
	case 'unlinkDir':
		if (mode === 'watch') {
			if (fileSystem) {
				fileSystem.rmdirSync(path.replace(join(PROJECT_ROOT, 'src'), ''));
				console.log(
					boldTerminalString(`${event}:`),
					shortenAbsolutePath(path).replace('src', MEMORY_DIRECTORY)
				);
			} else {
				rmdirSync(path);
				console.log(
					boldTerminalString(`${event}:`),
					shortenAbsolutePath(path).replace('src', OUTPUT_DIRECTORY)
				);
			}
			if (browserSync) browserSync.reload();
		}
		break;
	case 'unlink':
		if (mode === 'watch') {
			let file;
			switch (pathExtension) {
			case '.jade':
			case '.pug':
			case '.mjml':
			case '.md':
				file = path.replace(pathExtension, '.html');
				break;
			case '.styl':
				file = path.replace(pathExtension, '.css');
				break;
			default:
				file = path;
			}
			if (fileSystem) {
				const modifiedPath = file.replace(join(PROJECT_ROOT, 'src'), '');
				if (fileSystem.readdirSync(dirname(modifiedPath)).indexOf(basename(modifiedPath)) !== -1) {
					fileSystem.unlinkSync(modifiedPath);
					console.log(
						boldTerminalString(`${event}:`),
						shortenAbsolutePath(path).replace('src', MEMORY_DIRECTORY)
					);
					if (extname(file) === '.html') {
						removeSiteGridItem(path);
						renderTemplate(compileSiteGrid(sync(`${PROJECT_ROOT}/src/sitegrid.?(pug|jade)`)[0]), 'change');
					}
					if (browserSync) browserSync.reload();
				}
			} else {
				const modifiedPath = file.replace('src', OUTPUT_DIRECTORY);
				if (existsSync(modifiedPath)) {
					unlinkSync(modifiedPath);
					console.log(
						boldTerminalString(`${event}:`),
						shortenAbsolutePath(path).replace('src', OUTPUT_DIRECTORY)
					);
					if (extname(file) === '.html') {
						removeSiteGridItem(path);
						renderTemplate(compileSiteGrid(sync(`${PROJECT_ROOT}/src/sitegrid.?(pug|jade)`)[0]), 'change');
					}
					if (browserSync) browserSync.reload();
				}
			}
		}
		break;
	case 'add':
	case 'change':
		switch (pathExtension) {
		case '.jade':
		case '.pug':
		case '.mjml':
		case '.md':
		case '.html':
		case '.css':
		case '.styl':
			writeFileToDirectory(path, customReadFile(path), fileSystem, event);
			break;
		default:
			writeFileToDirectory(path, customReadFile(path, null), fileSystem, event);
		}
		if (browserSync) browserSync.reload();
		break;
	}
}

function handleAdjacentHTML(file, fileContent, fileSystem, compiler, browserSync, event, mode) {
	if (isString(file)) {
		let content;
		if (isString(fileContent)) {
			content = fileContent;
		} else {
			content = customReadFile(file);
		}
		if (content !== '') {
			// content // TODO autoprefixer inline css, uglify/prettify
			// process.env.UGLIFY
			handleAdjacentFile(file, content, fileSystem, compiler, event, mode);
			siteGridEngine(extractTitleFromHTML(content), file, file);
			renderTemplate(compileSiteGrid(sync(`${PROJECT_ROOT}/src/sitegrid.?(pug|jade)`)[0]), 'change');
			if (browserSync) browserSync.reload();
		}
	}
}

function handleAdjacentTemplate(file, fileSystem, compiler, browserSync, event, mode) {
	const content = customReadFile(file);
	if (content.length) {
		const fn = compile(content);
		const locals = {};
		handleAdjacentHTML(
			file.replace(extname(file), '.html'),
			fn(locals),
			fileSystem,
			compiler,
			browserSync,
			event,
			mode
		);
	}
}

function handleAdjacentMJML(file, fileSystem, compiler, browserSync, event, mode) {
	const content = customReadFile(file);
	if (content.length) {
		const { error, html } = mjml2html(content);
		if (!error) {
			handleAdjacentHTML(
				file.replace(extname(file), '.html'),
				html,
				fileSystem,
				compiler,
				browserSync,
				event,
				mode
			);
		} else {
			console.log(error);
		}
	}
}

// TODO standalone markdown
function handleAdjacentMarkdown(file, fileSystem, compiler, browserSync, event, mode) {}

function handleAdjacentStylus(file, fileSystem, compiler, browserSync, event, mode) {
	const content = customReadFile(file);
	if (content.length) {
		stylus(content)
			.render(function (err, css) {
				if (err) throw err;
				handleAdjacentCSS(
					file.replace(extname(file), '.css'),
					css,
					fileSystem,
					compiler,
					browserSync,
					event,
					mode
				);
			});
	}
}

function handleAdjacentCSS(file, fileContent, fileSystem, compiler, browserSync, event, mode) {
	if (isString(file)) {
		let content;
		if (isString(fileContent)) {
			content = fileContent;
		} else {
			content = customReadFile(file);
		}
		if (content.length) {
			// content // TODO autoprefixer inline css, uglify/prettify
			// process.env.UGLIFY
			handleAdjacentFile(file, content, fileSystem, compiler, event, mode);
			if (browserSync) browserSync.reload();
		}
	}
}

function adjacentDirectoriesRouter(file, fileSystem, compiler, browserSync, event, mode) {
	ADJACENT_DIRECTORIES_MODE = mode;
	switch (event) {
	case 'add':
	case 'change':
		switch (extname(file)) {
		case '.html':
			handleAdjacentHTML(file, undefined, fileSystem, compiler, browserSync, event, mode);
			break;
		case '.jade':
		case '.pug':
			handleAdjacentTemplate(file, fileSystem, compiler, browserSync, event, mode);
			break;
		case '.mjml':
			handleAdjacentMJML(file, fileSystem, compiler, browserSync, event, mode);
			break;
		case '.md':
			handleAdjacentMarkdown(file, fileSystem, compiler, browserSync, event, mode);
			break;
		case '.styl':
			handleAdjacentStylus(file, fileSystem, compiler, browserSync, event, mode);
			break;
		case '.css':
			handleAdjacentCSS(file, undefined, fileSystem, compiler, browserSync, event, mode);
			break;
		default:
			handleAdjacentAsset(file, fileSystem, compiler, browserSync, event, mode);
		}
		break;
	case 'addDir':
	case 'unlinkDir':
	case 'unlink':
		handleAdjacentAsset(file, fileSystem, compiler, browserSync, event, mode);
		break;
	}
}

function watchadjacentDirectories(watchPath, ignorePaths, fileSystem, compiler, browserSync) {
	if (isString(watchPath) && Array.isArray(ignorePaths) && ignorePaths.length) {
		watch(
			watchPath,
			{
				ignoreInitial: true,
				awaitWriteFinish: true,
				usePolling: true,
				ignored: ignorePaths.map(item => join(PROJECT_ROOT, 'src', item))
			}
		)
		.on('add', path => adjacentDirectoriesRouter(path, fileSystem, compiler, browserSync, 'add', 'watch'))
		.on('change', path => adjacentDirectoriesRouter(path, fileSystem, compiler, browserSync, 'change', 'watch'))
		.on('unlinkDir', path => adjacentDirectoriesRouter(path, fileSystem, compiler, browserSync, 'unlinkDir', 'watch'))
		.on('addDir', path => adjacentDirectoriesRouter(path, fileSystem, compiler, browserSync, 'addDir', 'watch'))
		.on('unlink', path => adjacentDirectoriesRouter(path, fileSystem, compiler, browserSync, 'unlink', 'watch'));
	}
}

function initAdjacentDirectories(outputPath, outputFileSystem, compiler, browserSync, ignoreFolders) {
	if (isString(outputPath) && ignoreFolders.every(item => isString(item))) {
		const pattern = sync(`${PROJECT_ROOT}/src/!(${ignoreFolders.join().replace(/,/g, '|')})/**/*.*`);
		pattern.forEach(file => adjacentDirectoriesRouter(file, outputFileSystem, compiler, browserSync, 'add', 'init'));
		if (outputFileSystem) {
			watchadjacentDirectories(
				join(PROJECT_ROOT, 'src', '**', '*.*'),
				ignoreFolders,
				outputFileSystem,
				compiler,
				browserSync
			);
		}
	}
}

function siteGridEngine(title, url, layout) {
	const path = join(PROJECT_ROOT, 'src');
	SITE_GRID.push({
		title: title || null,
		url: url.replace(path, '').replace(extname(url), '.html'),
		layout: layout.replace(join(path, sep), '')
	});
}

function removeSiteGridItem(itemPath) {
	if (isString(itemPath)) {
		const item = itemPath.replace(join(PROJECT_ROOT, 'src', sep), '').replace(extname(itemPath), '');
		const itemIndex = SITE_GRID.findIndex(function (element) {
			return element.layout.replace(extname(element.layout), '') === item;
		});
		if (itemIndex !== -1) SITE_GRID.splice(itemIndex, 1);
	}
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
		return compile(`${mod}\n${customReadFile(blockPath)}`);
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
		obj[basename(file, '.yml')] = safeLoad(customReadFile(file));
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

function renderTemplate(templateData, event = 'add') {
	if (Object.keys(templateData).length !== 0) {
		const path = join(PROJECT_ROOT, 'src', 'pages', templateData.filename);
		writeFileSync(path, templateData.content, 'utf-8');
		changeFileTimestamp(-10, path);
		console.log(boldTerminalString(`${event}:`), shortenAbsolutePath(path));
	}
}

function initHtmlWebpackPlugin(outputPath, outputFileSystem, compiler, browserSync) {
	if (!outputFileSystem && existsSync(PROD_OUTPUT)) {
		removeDirectory(PROD_OUTPUT);
		console.log(boldTerminalString('unlinkDir:'), shortenAbsolutePath(PROD_OUTPUT));
	}
	const pagesDirectory = join(PROJECT_ROOT, 'src', 'pages');
	if (existsSync(pagesDirectory)) {
		removeDirectory(pagesDirectory);
		console.log(boldTerminalString('unlinkDir:'), shortenAbsolutePath(pagesDirectory));
	}
	createDirectory(pagesDirectory);
	sync(`${PROJECT_ROOT}/src/!(sitegrid).?(pug|jade)`).forEach(item => renderTemplate(compileTemplate(item)));
	renderTemplate(compileSiteGrid(sync(`${PROJECT_ROOT}/src/sitegrid.?(pug|jade)`)[0]));
	initAdjacentDirectories(
		outputPath,
		outputFileSystem,
		compiler,
		browserSync,
		['assets', 'blocks', 'data', 'globals', 'layouts', 'pages', 'vendor']
	);
	return sync(`${PROJECT_ROOT}/src/pages/*.html`).map(function (item) {
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
