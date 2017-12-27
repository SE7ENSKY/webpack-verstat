const path = require('path');
const nib = require('nib');
const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const {
	PROJECT_ROOT,
	DEV_OUTPUT_DIRECTORY,
	generateEntry,
	getModifiedNib
} = require('../bin/core');
const postcssLoaderConfig = require('./postcss.loader.config');
const webpackBaseConfig = require('./webpack.base.config');


const devConfig = {
	entry: generateEntry([
		'event-source-polyfill',
		'webpack-hot-middleware/client'
	]),
	output: {
		path: DEV_OUTPUT_DIRECTORY,
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
						loader: 'postcss-loader',
						options: postcssLoaderConfig
					},
					{
						loader: 'resolve-url-loader',
						options: {
							includeRoot: true
						}
					}
				]
			},
			{
				test: /\.(sass|scss)$/,
				use: [
					'style-loader',
					'css-loader',
					{
						loader: 'postcss-loader',
						options: postcssLoaderConfig
					},
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
					{
						loader: 'postcss-loader',
						options: postcssLoaderConfig
					},
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
					{
						loader: 'postcss-loader',
						options: postcssLoaderConfig
					},
					{
						loader: 'resolve-url-loader',
						options: {
							includeRoot: true
						}
					},
					{
						loader: 'stylus-loader',
						options: {
							sourceMap: true,
							use: nib(),
							import: [
								path.join(PROJECT_ROOT, 'src', 'globals', 'variables.styl'),
								path.join(PROJECT_ROOT, 'src', 'globals', 'mixins.styl'),
								getModifiedNib(require.resolve('verstat-nib'))
							],
							preferPathResolver: 'webpack'
						}
					}
				]
			}
		]
	},
	plugins: [
		new webpack.HotModuleReplacementPlugin()
	]
};

module.exports = webpackMerge(webpackBaseConfig, devConfig);
