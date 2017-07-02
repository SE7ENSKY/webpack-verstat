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


const templateDependencies = new Map();
let templateDependenciesKey;

function shortenAbsolutePath(absolutePath) {
	if (isAbsolute(absolutePath)) {
		const rootPathParts = projectRoot.split(sep);
		return `${rootPathParts[rootPathParts.length - 1]}${absolutePath.replace(projectRoot, '')}`;
	}
	return absolutePath;
}

function boldTerminalString(str) {
	if (typeof str === 'string' || str instanceof String) {
		if (supportsColor) return chalk.bold(str);
		return str;
	}
	return '';
}

function readFile(fileName) {
	return readFileSync(fileName, { encoding: 'utf8' });
}

function getModifiedNib(path) {
	const dirPath = dirname(path);
	if (readFile(path).indexOf('path: fallback') !== -1) return join(dirPath, 'nib-mod-fallback.styl');
	return join(dirPath, 'nib-mod.styl');
}

function compileBlock(mod, block) {
	const blocks = sync(`${projectRoot}/src/blocks/**/*.?(pug|jade)`);
	const index = blocks.findIndex(item => item.indexOf(block) !== -1);
	if (index !== -1) {
		const blockPath = blocks[index];
		templateDependencies.get(templateDependenciesKey).blocks.push(blockPath);
		return compile(`${mod}\n${readFile(blockPath)}`);
	}
	return compile(`div [block ${block} not found]`);
}

function renderBlockEngine(blockName, data) {
	data.renderBlock = function (blockName, data) { return compileBlock(bemto, blockName)(data); };
	return compileBlock(bemto, blockName)(data);
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
	templateDependenciesKey = key;
	templateDependencies.set(
		key,
		{
			file: data,
			layout: template,
			blocks: []
		}
	);
}

// TODO templateDependencies update
function getTemplateBranch(templateWithData, template, block) {
	const branch = [];
	if (templateDependencies.size) {
		for (const [key, value] of templateDependencies) {
			const { file, layout, blocks } = value;
			if (file === templateWithData || layout === template || blocks.indexOf(block) !== -1) {
				branch.push(value.file);
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
	const layouts = sync(`${projectRoot}/src/layouts/!(main|root).?(pug|jade)`);
	const template = layouts.filter(layout => layout.indexOf(extractedData.layout) !== -1);
	if (template.length) {
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
			content: pretty(
				fn(locals),
				{
					ocd: true,
					indent_char: '\t',
					indent_size: 1
				}
			)
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
	removeFiles(sync(`${projectRoot}/src/pages/*.html`));
	sync(`${projectRoot}/src/*.?(pug|jade)`).forEach(function (item) {
		renderTemplate(compileTemplate(item));
	});
	return sync(`${projectRoot}/src/pages/*.html`).map(function (item) {
		return new HtmlWebpackPlugin({
			filename: basename(item),
			template: item,
			cache: true,
			hash: false,
			inject: 'body',
			minify: {
				removeComments: true
			}
		});
	});
}

module.exports = {
	projectRoot,
	templateDependencies,
	readFile,
	boldTerminalString,
	changeFileTimestamp,
	shortenAbsolutePath,
	getTemplateBranch,
	renderTemplate,
	compileTemplate,
	getModifiedNib,
	initHtmlWebpackPlugin
};
