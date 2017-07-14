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
	writeFileSync,
	existsSync,
	unlinkSync,
	utimesSync
} = require('fs');
const { sync } = require('glob');
const {
	compile,
	compileFile
} = require('pug');
const bemto = require('verstat-bemto/index-tabs');
const projectRoot = resolve(__dirname, '../');
const HtmlWebpackPlugin = require('html-webpack-plugin');


// TODO [!] autoprefix inline styles in html
// TODO minimize webpack output
// TODO standalone markdown
// TODO happypack
// TODO update readme.md
// TODO letters: html/css, pug/stylus, mjml
// TODO pug markdown: jstransformer-markdown-it (https://pugjs.org/language/filters.html)
// TODO pug babel: jstransformer-babel (https://pugjs.org/language/filters.html)
// TODO server errors/adjacent folders
// TODO watching files on older versions of Windows, Ubuntu, Vagrant, and Docker
// TODO web workers ?
// TODO service worker ?

const TEMPLATE_DEPENDENCIES = new Map();
let TEMPLATE_DEPENDENCIES_KEY;
const SITE_GRID = [];

function generateEntry(server) {
	const entry = sync(`${projectRoot}/src/assets/*.js`);
	if (entry.length) {
		const obj = {};
		const file = entry[0];
		const objProp = basename(file, '.js');
		obj[objProp] = [file.replace(`${projectRoot}/src`, '.')];
		if (typeof server === 'string' || server instanceof String) {
			obj[objProp].push(server);
		}
		return obj;
	}
	return null;
}

function gererateVendor() {
	const vendor = sync(`${projectRoot}/src/assets/*.js`);
	if (vendor.length) return `${basename(vendor[0], '.js')}.vendor`;
	return 'vendor';
}

function shortenAbsolutePath(absolutePath) {
	if (isAbsolute(absolutePath)) {
		const rootPathParts = projectRoot.split(sep);
		return `${rootPathParts[rootPathParts.length - 1]}${absolutePath.replace(projectRoot, '')}`;
	}
	return absolutePath;
}

function prettifyHTML(str, options) {
	if (typeof str === 'string' || str instanceof String) {
		const defaultOptions = {
			ocd: true,
			indent_char: '\t',
			indent_size: 1
		};
		return pretty(str, options ? Object.assign(defaultOptions, options) : defaultOptions);
	}
}

function boldTerminalString(str) {
	if (typeof str === 'string' || str instanceof String) {
		if (supportsColor) return chalk.bold(str);
		return str;
	}
}

function readFile(fileName) {
	return readFileSync(fileName, { encoding: 'utf8' });
}

function getModifiedNib(path) {
	const dirPath = dirname(path);
	if (readFile(path).indexOf('path: fallback') !== -1) {
		return join(dirPath, 'nib-mod-fallback.styl');
	}
	return join(dirPath, 'nib-mod.styl');
}

function siteGridEngine(title, url, layout) {
	SITE_GRID.push({
		title: title || null,
		url: url.replace(`${projectRoot}/src`, '').replace(extname(url), '.html'),
		layout: layout.replace(`${projectRoot}/src/`, '')
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
	const blocks = sync(`${projectRoot}/src/blocks/**/*.?(pug|jade)`);
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
	const data = sync(`${projectRoot}/src/data/*.yml`).map((file) => {
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
	const layouts = sync(`${projectRoot}/src/layouts/*.?(pug|jade)`);
	const template = layouts.filter(layout => layout.indexOf(extractedData.layout) !== -1);
	if (template.length) {
		siteGridEngine(extractedData.title, templateWithData, extractedData.layout);
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
		const path = join(projectRoot, 'src', 'pages', templateData.filename);
		writeFileSync(path, templateData.content, 'utf-8');
		changeFileTimestamp(-10, path);
		console.log(boldTerminalString('add:'), shortenAbsolutePath(path));
	}
}

function initHtmlWebpackPlugin() {
	const pages = `${projectRoot}/src/pages/*.html`;
	removeFiles(sync(pages));
	sync(`${projectRoot}/src/!(sitegrid).?(pug|jade)`).forEach(function (item) {
		renderTemplate(compileTemplate(item));
	});
	sync(`${projectRoot}/src/sitegrid.?(pug|jade)`).forEach(function (item) {
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
	projectRoot,
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
