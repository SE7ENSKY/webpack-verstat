const yamlFront = require('yaml-front-matter');
const fsReadFileSync = require('fs').readFileSync;
const globSync = require('glob').sync;
const bemto = require('verstat-bemto');
const pathResolve = require('path').resolve;
const pathExtname = require('path').extname;
const pathBasename = require('path').basename;
const yamlParse = require('yamljs').parse;
const pug = require('pug');


const basePath = pathResolve(__dirname, '../');
const layouts = globSync(`${basePath}/src/layouts/!(main|root).?(pug|jade)`);
const layoutsData = globSync(`${basePath}/src/*.?(pug|jade)`);
const globalLayoutsData = globSync(`${basePath}/src/data/*.?(yml|json)`);
const blocks = globSync(`${basePath}/src/blocks/**/*.?(pug|jade)`);

const readFile = fileName => fsReadFileSync(fileName, { encoding: 'utf8' });
const compileBlock = (mod, block) => {
  const index = blocks.findIndex(item => item.indexOf(block) !== -1);
  if (index !== -1) return pug.compile(`${mod}\n${readFile(blocks[index])}`);
};
const renderBlockEngine = (blockName, data) => {
  data.renderBlock = (blockName, data) => compileBlock(bemto, blockName)(data);
  return compileBlock(bemto, blockName)(data);
};

// const fn = pug.compile(readFile(`${basePath}/src/layouts/root.pug`));
const fn = pug.compileFile(layouts[0]);
// pug.compile(`${bemto}\n${readFile(`${basePath}/src/layouts/root.pug`)}`, { cache: true });
const locals = {
  renderBlock: renderBlockEngine
};
// const locals = {};
fn.dependencies.push(`${basePath}/src/vendor/bemto/bemto.pug`);
// console.log(fn.dependencies);
console.log(fn(locals));
