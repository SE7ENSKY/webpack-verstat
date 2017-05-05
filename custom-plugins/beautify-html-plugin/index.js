const pretty = require('pretty');

function BeautifyHtmlPlugin(options) {
  this.options = Object.assign({ ocd: false }, options);
}

BeautifyHtmlPlugin.prototype.apply = function (compiler) {
  compiler.plugin('compilation', (compilation) => {
    compilation.plugin('html-webpack-plugin-after-html-processing', (htmlPluginData, callback) => {
      const content = htmlPluginData.html;
      htmlPluginData.html = content.replace(content, pretty(content, this.options));
      callback(null, htmlPluginData);
    });
  });
};

module.exports = BeautifyHtmlPlugin;
