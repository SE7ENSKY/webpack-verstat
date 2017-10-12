const supportsColor = require('supports-color');
const postcss = require('postcss');
const chalk = require('chalk');
const fm = require('front-matter');
const cssNext = require('postcss-cssnext');
const cssMQpacker = require('css-mqpacker');
const perfectionist = require('perfectionist');
const cssNano = require('cssnano');
const { mjml2html } = require('mjml');
const stylus = require('stylus');
const { merge } = require('lodash');
const {
	resolve,
	extname,
	basename,
	dirname,
	sep,
	join,
	isAbsolute,
	normalize
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


// ---------------------- Constants ----------------------
const ASSETS_NAMING_CONVENTION = {
	images: 'i',
	fonts: 'f',
	videos: 'v',
	scripts: 'scripts',
	styles: 'styles'
};
const PROJECT_ROOT = resolve(__dirname, '../');
const POSTCSS_CONFIG = join(PROJECT_ROOT, 'config', 'postcss.config.js');
const OUTPUT_DIRECTORY = 'dist';
const MEMORY_DIRECTORY = 'memory-fs';
const PROD_OUTPUT = join(PROJECT_ROOT, OUTPUT_DIRECTORY);
let ADJACENT_DIRECTORIES_MODE;
const DEV_OUTPUT = '/';
const TEMPLATE_DEPENDENCIES = new Map();
let TEMPLATE_DEPENDENCIES_KEY;
const SITE_GRID = [];
const CONSOLE_OUTPUT = {
	colors: true,
	modules: false,
	children: false,
	hash: process.env.NODE_ENV === 'production',
	timings: process.env.NODE_ENV === 'production'
};
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
// ---------------------- Constants ----------------------

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
		if (Array.isArray(server) && server.every(item => isString(item))) {
			server.reverse().forEach(item => obj[objProp].unshift(item));
		}
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
		return pretty(str, options ? merge(defaultOptions, options) : defaultOptions);
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
		if (extname(shortPath).length) {
			filePathParts = dirname(shortPath).split(sep).filter(item => item.length);
		} else {
			filePathParts = shortPath.split(sep).filter(item => item.length);
		}
		filePathParts = filePathParts.filter(item => item !== '.DS_Store'); // fix for .DS_Store
		if (filePathParts.length) {
			let dirPath = '';
			if (fileSystem) {
				filePathParts.forEach(function (item, index) {
					if (fileSystem.readdirSync(index === 0 ? DEV_OUTPUT : dirPath).indexOf(filePathParts[index]) === -1) {
						dirPath += `${DEV_OUTPUT}${filePathParts[index]}`;
						fileSystem.mkdirpSync(dirPath);
						console.log(
							boldTerminalString('addDir:'),
							shortenAbsolutePath(join(PROJECT_ROOT, MEMORY_DIRECTORY, dirPath))
						);
					} else {
						dirPath += `${DEV_OUTPUT}${filePathParts[index]}`;
					}
				});
			} else {
				dirPath = PROJECT_ROOT;
				filePathParts.forEach(function (item, index) {
					if (readdirSync(dirPath).indexOf(filePathParts[index]) === -1) {
						dirPath += join(sep, filePathParts[index]);
						mkdirSync(dirPath);
						const shortenPath = shortenAbsolutePath(dirPath);
						if (shortenPath.indexOf('pages') !== -1) {
							console.log(boldTerminalString('addDir:'), shortenPath);
						} else {
							console.log(boldTerminalString('addDir:'), shortenPath.replace('src', OUTPUT_DIRECTORY));
						}
					} else {
						dirPath += join(sep, filePathParts[index]);
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
				fileSystem.writeFileSync(filePath.replace(/\\/g, '/'), fileContent);
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
			if (existsSync(PROD_OUTPUT)) {
				writeFileToDirectory(file, fileContent, fileSystem, event);
			} else {
				setTimeout(function waitForOutputDirectory() {
					if (!existsSync(PROD_OUTPUT)) {
						setTimeout(waitForOutputDirectory, 20);
					} else {
						writeFileToDirectory(file, fileContent, fileSystem, event);
					}
				}, 20);
			}
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

function handleAdjacentHTML(file, fileContent, prettify, fileSystem, compiler, browserSync, event, mode) {
	if (isString(file)) {
		let content;
		if (isString(fileContent)) {
			content = fileContent;
		} else {
			content = customReadFile(file);
		}
		if (content.length) {
			const prettifyConfig = {
				indent_char: ' ',
				indent_size: 2
			};
			handleAdjacentFile(
				file,
				prettify ? prettifyHTML(content, prettifyConfig) : content,
				fileSystem,
				compiler,
				event,
				mode
			);
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
			true,
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
				false,
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

function handleAdjacentMarkdown(file, fileSystem, compiler, browserSync, event, mode) {
	const extractedData = fm(customReadFile(file));
	if (Object.keys(extractedData.attributes).length !== 0) {
		const modifiedExtractedData = merge(
			{ content: extractedData.body },
			extractedData,
			extractedData.attributes
		);
		delete modifiedExtractedData.body;
		delete modifiedExtractedData.layout;
		delete modifiedExtractedData.attributes;
		delete modifiedExtractedData.frontmatter;
		const layouts = sync(`${PROJECT_ROOT}/src/layouts/*.?(pug|jade)`);
		const template = layouts.filter(layout => layout.indexOf(extractedData.attributes.layout) !== -1);
		if (template.length) {
			const fn = compileFile(template[0]);
			const initialLocals = {
				renderBlock: renderBlockEngine,
				file: modifiedExtractedData,
				content: modifiedExtractedData.content
			};
			const locals = merge(initialLocals, getGlobalData());
			handleAdjacentHTML(
				file.replace(extname(file), '.html'),
				fn(locals),
				true,
				fileSystem,
				compiler,
				browserSync,
				event,
				mode
			);
		}
	}
}

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
			const postcssPlugins = [
				cssNext({
					autoprefixer: {
						browsers: SUPPORTED_BROWSERS_LIST
					}
				}),
				cssMQpacker(),
				cssNano(merge(CSS_NANO_BASE_CONFIG, process.env.UGLIFY ? CSS_NANO_MINIMIZE_CONFIG : {}))
			];
			if (!process.env.UGLIFY) postcssPlugins.push(perfectionist(PERFECTIONIST_CONFIG));
			postcss(postcssPlugins)
			.process(content)
			.then(function (result) {
				handleAdjacentFile(file, result.css, fileSystem, compiler, event, mode);
				if (browserSync) browserSync.reload();
			});
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
			handleAdjacentHTML(normalize(file), undefined, true, fileSystem, compiler, browserSync, event, mode);
			break;
		case '.jade':
		case '.pug':
			handleAdjacentTemplate(normalize(file), fileSystem, compiler, browserSync, event, mode);
			break;
		case '.mjml':
			handleAdjacentMJML(normalize(file), fileSystem, compiler, browserSync, event, mode);
			break;
		case '.md':
			handleAdjacentMarkdown(normalize(file), fileSystem, compiler, browserSync, event, mode);
			break;
		case '.styl':
			handleAdjacentStylus(normalize(file), fileSystem, compiler, browserSync, event, mode);
			break;
		case '.css':
			handleAdjacentCSS(normalize(file), undefined, fileSystem, compiler, browserSync, event, mode);
			break;
		default:
			handleAdjacentAsset(normalize(file), fileSystem, compiler, browserSync, event, mode);
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
				interval: 100,
				binaryInterval: 300,
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
			compiler.plugin('done', (stats) => ADJACENT_DIRECTORIES_MODE = 'watch');
		}
	}
}

function siteGridEngine(title, url, layout) {
	const path = join(PROJECT_ROOT, 'src').replace(/\\/g, '/');
	SITE_GRID.push({
		title: title || null,
		url: url.replace(extname(url), '.html').replace(/\\/g, '/').replace(path, ''),
		layout: layout.replace(join(path, sep), '').replace(/\\/g, '/')
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
		const commonsPath = sync(`${PROJECT_ROOT}/src/globals/commons.?(pug|jade)`);
		TEMPLATE_DEPENDENCIES.get(TEMPLATE_DEPENDENCIES_KEY).blocks.set(block, blockPath);
		return compile(`${customReadFile(commonsPath[0])}\n${mod}\n${customReadFile(blockPath)}`);
	}
	TEMPLATE_DEPENDENCIES.get(TEMPLATE_DEPENDENCIES_KEY).blocks.set(block, null);
	return compile(`div [block ${block} not found]`);
}

function renderBlockEngine(blockName, data) {
	data.renderBlock = function (blockName, data) {
		renderBlockEngine(blockName, data);
		return compileBlock(bemto, blockName[0])(data);
	};
	return compileBlock(bemto, blockName[0])(data);
}

function getGlobalData() {
	const data = sync(`${PROJECT_ROOT}/src/data/*.?(yml|yaml)`).map((file) => {
		const obj = {};
		obj[basename(file, extname(file))] = safeLoad(customReadFile(file));
		return obj;
	});
	return data.length ? merge({}, ...data) : {};
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
	const modifiedExtractedData = merge({}, extractedData);
	delete modifiedExtractedData.layout;
	delete modifiedExtractedData.content;
	const layouts = sync(`${PROJECT_ROOT}/src/layouts/*.?(pug|jade)`);
	const template = layouts.filter(layout => layout.indexOf(extractedData.layout) !== -1);
	if (template.length) {
		siteGridEngine(
			extractedData.title,
			templateWithData,
			extname(extractedData.layout).length ? extractedData.layout : `${extractedData.layout}${extname(template[0])}`
		);
		templateDependenciesEngine(template[0], templateWithData);
		const fn = compileFile(template[0]);
		const initialLocals = {
			renderBlock: renderBlockEngine,
			file: modifiedExtractedData,
			content: (function () {
				const fn = compile(`${bemto}\n${extractedData.content}`);
				const initialLocals = { renderBlock: renderBlockEngine };
				const locals = merge(initialLocals, modifiedExtractedData, getGlobalData());
				return fn(locals);
			})()
		};
		const locals = merge(initialLocals, getGlobalData());
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
	if (existsSync(PROD_OUTPUT)) {
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
		['assets', 'blocks', 'data', 'globals', 'layouts', 'pages', 'vendor', '*.*']
	);
	return sync(`${PROJECT_ROOT}/src/pages/*.html`).map(function (item) {
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
			minify: {
				removeComments: true
			}
		});
	});
}

module.exports = {
	PROJECT_ROOT,
	PROD_OUTPUT,
	POSTCSS_CONFIG,
	DEV_OUTPUT,
	ASSETS_NAMING_CONVENTION,
	CONSOLE_OUTPUT,
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
