const path = require('path');
const bemto = require(`${path.dirname(__filename)}/verstat-bemto`);

module.exports = function (source) {
  if (this.cacheable) {
    this.cacheable(true);
  }

  // const matchResult = source.match(/extends\s+\w+|\w+.pug\s|\n/i)[0];

  // return matchResult !== '\n' || ' ' ? `${matchResult.trim()}\n${source.replace(matchResult, `${bemto}\n`)}` : `${bemto}\n${source}`;
  return `${bemto}\n${source}`;
};
