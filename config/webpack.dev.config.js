const webpackHotModuleReplacementPlugin = require('webpack').HotModuleReplacementPlugin;
const webpackNamedModulesPlugin = require('webpack').NamedModulesPlugin;
const webpackMerge = require('webpack-merge');
const baseConfig = require('./webpack.base.config');


const devConfig = {
	entry: [
		'webpack-dev-server/client?http://localhost:8080',
		'webpack/hot/dev-server',
		'./assets/main.js'
	],
	output: {
		publicPath: '/',
		filename: 'assets/[name].js'
	},
	devtool: 'cheap-module-eval-source-map',
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [
					'style-loader',
					'css-loader',
					{
						loader: 'resolve-url-loader',
						options: {
							includeRoot: true
						}
					},
					'postcss-loader'
				]
			},
			{
				test: /\.(sass|scss)$/,
				use: [
					'style-loader',
					'css-loader',
					'postcss-loader',
					{
						loader: 'resolve-url-loader',
						options: {
							includeRoot: true
						}
					},
					{
						loader: 'sass-loader',
						options: {
							sourceMap: true
						}
					}
				]
			},
			{
				test: /\.less$/,
				use: [
					'style-loader',
					'css-loader',
					'postcss-loader',
					{
						loader: 'resolve-url-loader',
						options: {
							includeRoot: true
						}
					},
					{
						loader: 'less-loader',
						options: {
							sourceMap: true
						}
					}
				]
			},
			{
				test: /\.styl$/,
				use: [
					'style-loader',
					'css-loader',
					'postcss-loader',
					{
						loader: 'resolve-url-loader',
						options: {
							includeRoot: true
						}
					},
					{
						loader: 'stylus-loader',
						options: {
							sourceMap: true
						}
					}
				]
			}
		]
	},
	plugins: [
		new webpackHotModuleReplacementPlugin(),
		new webpackNamedModulesPlugin()
	]
};

module.exports = webpackMerge(baseConfig, devConfig);
