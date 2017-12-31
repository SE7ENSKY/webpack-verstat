require('console-stamp')(console, {
	pattern: 'HH:MM:ss',
	label: false
});

const webpack = require('webpack');
const webpackProdConfig = require('../configs/webpack.prod.config');
const consoleOutputConfig = require('../configs/console.output.config');
const {
	PROD_OUTPUT_DIRECTORY,
	initTemplateEngine,
	addHtmlWebpackPlugins
} = require('./core');

const compiler = webpack(webpackProdConfig);
initTemplateEngine(
	() => {
		compiler.apply(...addHtmlWebpackPlugins());
		compiler.run((err, stats) => console.log(stats.toString(consoleOutputConfig)));
	},
	PROD_OUTPUT_DIRECTORY
);
