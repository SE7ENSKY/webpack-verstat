const { join } = require('path');
const nib = require('nib');
const HappyPack = require('happypack');
const { HotModuleReplacementPlugin } = require('webpack');
const webpackMerge = require('webpack-merge');
const {
	PROJECT_ROOT,
	DEV_OUTPUT_DIRECTORY,
	generateEntry,
	getModifiedNib
} = require('../bin/core');
const postcssLoaderConfig = require('./postcss.loader.config');
const {
	baseConfig,
	happyThreadPool
} = require('./webpack.base.config');


const devConfig = {
	entry: generateEntry([
		'event-source-polyfill',
		'webpack-hot-middleware/client'
	]),
	output: {
		path: DEV_OUTPUT_DIRECTORY,
		filename: 'assets/[name].js'
	},
	devtool: 'cheap-module-eval-source-map',
	module: {
		rules: [
			{
				test: /\.css$/,
				use: 'happypack/loader?id=css'
			},
			{
				test: /\.(sass|scss)$/,
				use: 'happypack/loader?id=sass'
			},
			{
				test: /\.less$/,
				use: 'happypack/loader?id=less'
			},
			{
				test: /\.styl$/,
				use: 'happypack/loader?id=styl'
			}
		]
	},
	plugins: [
		new HotModuleReplacementPlugin(),
		new HappyPack({
			id: 'css',
			verbose: false,
			threadPool: happyThreadPool,
			loaders: [
				'style-loader',
				'css-loader',
				{
					path: 'postcss-loader',
					query: postcssLoaderConfig
				}
			]
		}),
		new HappyPack({
			id: 'sass',
			verbose: false,
			threadPool: happyThreadPool,
			loaders: [
				'style-loader',
				'css-loader',
				{
					path: 'postcss-loader',
					query: postcssLoaderConfig
				},
				{
					path: 'sass-loader',
					query: {
						sourceMap: !!process.env.SOURCEMAP
					}
				}
			]
		}),
		new HappyPack({
			id: 'less',
			verbose: false,
			threadPool: happyThreadPool,
			loaders: [
				'style-loader',
				'css-loader',
				{
					path: 'postcss-loader',
					query: postcssLoaderConfig
				},
				{
					path: 'less-loader',
					query: {
						sourceMap: !!process.env.SOURCEMAP
					}
				}
			]
		}),
		new HappyPack({
			id: 'styl',
			verbose: false,
			threadPool: happyThreadPool,
			loaders: [
				'style-loader',
				'css-loader',
				{
					path: 'postcss-loader',
					query: postcssLoaderConfig
				},
				{
					path: 'stylus-loader',
					query: {
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
		})
	]
};

module.exports = webpackMerge(baseConfig, devConfig);
