const pathResolve = require('path').resolve;
const pathExtname = require('path').extname;
const pathBasename = require('path').basename;
const pathDirname = require('path').dirname;
const pathSep = require('path').sep;
const pathIsAbsolute = require('path').isAbsolute;
const pathJoin = require('path').join;
const yamlParse = require('js-yaml').safeLoad;
// const pretty = require('pretty');
const verstatLoadFront = require('verstat-front-matter').loadFront;
const fsReadFileSync = require('fs').readFileSync;
const fsWriteFileSync = require('fs').writeFileSync;
const fsExistsSync = require('fs').existsSync;
const fsUnlinkSync = require('fs').unlinkSync;
const fsUtimes = require('fs').utimesSync;
const globSync = require('glob').sync;
const pugCompile = require('pug').compile;
const pugCompileFile = require('pug').compileFile;
const bemto = require('verstat-bemto/index-tabs');
const projectRoot = pathResolve(__dirname, '../');
const HtmlWebpackPlugin = require('html-webpack-plugin');


const templateInfo = [];
let templateInfoIndex;

function shortenAbsolutePath(absolutePath) {
	if (pathIsAbsolute(absolutePath)) {
		const rootPathParts = projectRoot.split(pathSep);
		return `${rootPathParts[rootPathParts.length - 1]}${absolutePath.replace(projectRoot, '')}`;
	}
	return absolutePath;
}

function readFile(fileName) {
	return fsReadFileSync(fileName, { encoding: 'utf8' });
}

function getModifiedNib(path) {
	const dirPath = pathDirname(path);
	if (readFile(path).indexOf('path: fallback') !== -1) return pathJoin(dirPath, 'nib-mod-fallback.styl');
	return pathJoin(dirPath, 'nib-mod.styl');
}

function compileBlock(mod, block) {
	const blocks = globSync(`${projectRoot}/src/blocks/**/*.?(pug|jade)`);
	const index = blocks.findIndex(item => item.indexOf(block) !== -1);
	if (index !== -1) {
		const block = blocks[index];
		templateInfo[templateInfoIndex].blocks.push(pathBasename(block, pathExtname(block)));
		return pugCompile(`${mod}\n${readFile(block)}`);
	}
}

function renderBlockEngine(blockName, data) {
	data.renderBlock = function (blockName, data) { return compileBlock(bemto, blockName)(data); };
	return compileBlock(bemto, blockName)(data);
}

function getGlobalData() {
	const data = globSync(`${projectRoot}/src/data/*.yml`).map((file) => {
		const obj = {};
		obj[pathBasename(file, '.yml')] = yamlParse(readFile(file));
		return obj;
	});
	return data.length ? Object.assign({}, ...data) : {};
}

function compileTemplates() {
	return globSync(`${projectRoot}/src/*.?(pug|jade)`).map(function (layoutData, index) {
		const extractedData = verstatLoadFront(layoutData, '\/\/---', 'content');
		const modifiedExtractedData = Object.assign({}, extractedData);
		delete modifiedExtractedData.layout;
		delete modifiedExtractedData.content;
		const layouts = globSync(`${projectRoot}/src/layouts/!(main|root).?(pug|jade)`);
		const template = layouts.filter(layout => layout.indexOf(extractedData.layout) !== -1);
		if (template.length) {
			const file = template[0];
			templateInfoIndex = index;
			templateInfo[templateInfoIndex] = {
				name: pathBasename(file, pathExtname(file)),
				blocks: []
			};
			const fn = pugCompileFile(file);
			const initialLocals = {
				renderBlock: renderBlockEngine,
				file: modifiedExtractedData,
				content: (function () {
					const fn = pugCompile(`${bemto}\n${extractedData.content}`);
					const initialLocals = { renderBlock: renderBlockEngine };
					const locals = Object.assign(initialLocals, modifiedExtractedData, getGlobalData());
					return fn(locals);
				})()
			};
			const locals = Object.assign(initialLocals, getGlobalData());
			return {
				filename: `${pathBasename(layoutData, pathExtname(layoutData))}.html`,
				content: fn(locals) // minify
				// content: pretty(fn(locals), { ocd: true }) // unminify & pretty
			};
		}
	});
}

function removeFiles(files) {
	if (files.length) {
		files.forEach(function (item) {
			if (fsExistsSync(item)) {
				fsUnlinkSync(item);
				console.log(`Delete old: ${shortenAbsolutePath(item)}`);
			}
		});
	}
}

function renderTemplates(files) {
	files.forEach(function (item) {
		const timeNow = Date.now() / 1000;
		const timeThen = timeNow - 10;
		const path = pathJoin(projectRoot, 'src', 'pages', item.filename);
		fsWriteFileSync(path, item.content, 'utf-8');
		fsUtimes(path, timeThen, timeThen);
		console.log(`Create: ${shortenAbsolutePath(path)}`);
	});
}

function initHtmlWebpackPlugin() {
	removeFiles(globSync(`${projectRoot}/src/pages/*.html`));
	renderTemplates(compileTemplates());
	return globSync(`${projectRoot}/src/pages/*.html`).map(function (item) {
		return new HtmlWebpackPlugin({
			filename: pathBasename(item),
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
	templateInfo,
	readFile,
	getModifiedNib,
	// compileTemplates,
	// renderTemplates,
	initHtmlWebpackPlugin
};
