const pathResolve = require('path').resolve;
const pathExtname = require('path').extname;
const pathBasename = require('path').basename;
const yamlParse = require('yamljs').parse;
const fsReadFileSync = require('fs').readFileSync;
const globSync = require('glob').sync;
const pugCompile = require('pug').compile;
const bemto = require('../src/vendor/bemto/bemto.js');

const basePath = pathResolve(__dirname, '../');

const readFile = function (fileName) {
  return fsReadFileSync(fileName, { encoding: 'utf8' });
};

const compileTemplate = function (mod, block) {
  const blockFile = globSync(`${basePath}/src/components/${block}/${block}.?(pug|jade)`);
  if (blockFile.length) {
    return pugCompile(`${mod}\n${readFile(blockFile[0])}`);
  }
};

const renderBlockEngine = function (blockName, data) {
  data.renderBlock = function (blockName, data) { return compileTemplate(bemto, blockName)(data); };
  return compileTemplate(bemto, blockName)(data);
};

const localDataEngine = function (templateFileBaseName) {
  const dataFile = globSync(`${basePath}/src/data/local/${templateFileBaseName}.?(json|yml)`);
  if (dataFile.length) {
    switch (pathExtname(dataFile[0])) {
      case '.json':
        return JSON.parse(readFile(dataFile[0]));
      case '.yml':
        return yamlParse(readFile(dataFile[0]));
    }
  }
  return {};
};

const globalDataEngine = function () {
  const globalDataFiles = globSync(`${basePath}/src/data/global/*.?(json|yml)`).map((file) => {
    const obj = {};
    switch (pathExtname(file)) {
      case '.json':
        obj[pathBasename(file, '.json')] = JSON.parse(readFile(file));
        break;
      case '.yml':
        obj[pathBasename(file, '.yml')] = yamlParse(readFile(file));
        break;
    }
    return obj;
  });
  return globalDataFiles.length ? Object.assign({}, ...globalDataFiles) : {};
};


module.exports = {
  basePath,
  renderBlockEngine,
  localDataEngine,
  globalDataEngine
};
