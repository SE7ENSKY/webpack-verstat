const { join } = require('path');
const nib = require('nib');
const HappyPack = require('happypack');
const happyThreadPool = HappyPack.ThreadPool({ size: 4 });
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
	entry: generateEntry(['event-source-polyfill']),
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

module.exports = webpackMerge(webpackBaseConfig, devConfig);
