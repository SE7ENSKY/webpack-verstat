require('console-stamp')(console, {
	pattern: 'HH:MM:ss',
	label: false
});

const webpack = require('webpack');
const webpackProdConfig = require('../configs/webpack.prod.config');
const consoleOutputConfig = require('../configs/console.output.config');
const {
	initTemplateEngine,
	addHtmlWebpackPlugins
} = require('./core');

const compiler = webpack(webpackProdConfig);
initTemplateEngine(() => {
	compiler.apply(...addHtmlWebpackPlugins());
	compiler.run((err, stats) => console.log(stats.toString(consoleOutputConfig)));
});
