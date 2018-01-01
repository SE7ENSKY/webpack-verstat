const { join } = require('path');
const nib = require('nib');
const { HotModuleReplacementPlugin } = require('webpack');
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
						loader: 'sass-loader',
						options: {
							sourceMap: !!process.env.SOURCEMAP
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
						loader: 'less-loader',
						options: {
							sourceMap: !!process.env.SOURCEMAP
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
						loader: 'stylus-loader',
						options: {
							sourceMap: !!process.env.SOURCEMAP,
							use: nib(),
							import: [
								join(PROJECT_ROOT, 'src', 'globals', 'variables.styl'),
								join(PROJECT_ROOT, 'src', 'globals', 'functions.styl'),
								join(PROJECT_ROOT, 'src', 'globals', 'mixins.styl'),
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
		new HotModuleReplacementPlugin()
	]
};

module.exports = webpackMerge(webpackBaseConfig, devConfig);
