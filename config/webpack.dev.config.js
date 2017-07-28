const { join } = require('path');
const nib = require('nib');
const cssNext = require('postcss-cssnext');
const {
	HotModuleReplacementPlugin,
	NoEmitOnErrorsPlugin,
	ProvidePlugin,
	LoaderOptionsPlugin,
	WatchIgnorePlugin,
	DefinePlugin
} = require('webpack');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const {
	PROJECT_ROOT,
	DEV_OUTPUT,
	SUPPORTED_BROWSERS_LIST,
	generateEntry,
	getModifiedNib
} = require('../bin/utils');


const fileLoaderExclude = [
	join(PROJECT_ROOT, 'node_modules'),
	join(PROJECT_ROOT, 'src', 'vendor')
];
const urlLoaderInclude = fileLoaderExclude;


const devConfig = {
	context: join(PROJECT_ROOT, 'src'),
	entry: generateEntry('webpack-hot-middleware/client'),
	output: {
		path: DEV_OUTPUT,
		publicPath: '/',
		filename: 'assets/[name].js'
	},
	devtool: 'cheap-module-eval-source-map',
	target: 'web',
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [
					'style-loader',
					'css-loader',
					'postcss-loader'
				]
			},
			{
				test: /\.(sass|scss)$/,
				use: [
					'style-loader',
					'css-loader',
					'postcss-loader',
					'sass-loader'
				]
			},
			{
				test: /\.less$/,
				use: [
					'style-loader',
					'css-loader',
					'postcss-loader',
					'less-loader'
				]
			},
			{
				test: /\.styl$/,
				use: [
					'style-loader',
					'css-loader',
					'postcss-loader',
					'stylus-loader'
				]
			},
			{
				test: /\.(jpg|png|gif|eot|ttf|woff|woff2|svg)$/,
				include: urlLoaderInclude,
				use: 'url-loader'
			},
			{
				test: /\.(jpg|png|gif|eot|ttf|woff|woff2|svg|mp4|webm)$/,
				exclude: fileLoaderExclude,
				loader: 'file-loader'
			},
			{
				test: /\.json$/,
				use: 'json-loader'
			},
			{
				test: /\.yaml$/,
				use: 'yaml-loader'
			},
			{
				test: /\.md$/,
				use: ['html-loader', 'markdown-loader']
			},
			{
				test: /\.html$/,
				use: 'html-loader'
			},
			{
				test: /\.coffee$/,
				use: 'coffee-loader'
			},
			{
				test: /\.js$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
					options: {
						cacheDirectory: true,
						babelrc: false,
						plugins: ['transform-runtime'],
						presets: [
							[
								'env',
								{
									targets: {
										browsers: SUPPORTED_BROWSERS_LIST
									},
									modules: false,
									loose: true,
									useBuiltIns: true
								}
							]
						]
					}
				}
			}
		]
	},
	plugins: [
		new DefinePlugin({
			'process.env': {
				NODE_ENV: process.env.NODE_ENV
			}
		}),
		new NoEmitOnErrorsPlugin(),
		new ProvidePlugin({
			$: 'jquery',
			jQuery: 'jquery'
		}),
		new HotModuleReplacementPlugin(),
		new CopyWebpackPlugin([
			{
				from: join('assets', 'fonts'),
				to: join('assets', 'fonts')
			},
			{
				from: join('assets', 'img'),
				to: join('assets', 'img')
			},
			{
				from: join('assets', 'video'),
				to: join('assets', 'video')
			}
		]),
		new LoaderOptionsPlugin({
			options: {
				stylus: {
					use: [nib()],
					import: [getModifiedNib(require.resolve('verstat-nib'))],
					preferPathResolver: 'webpack'
				},
				postcss: [
					cssNext({
						autoprefixer: {
							browsers: SUPPORTED_BROWSERS_LIST
						}
					})
				]
			}
		}),
		new WatchIgnorePlugin([join(PROJECT_ROOT, 'node_modules')]),
		new CircularDependencyPlugin({
			exclude: /node_modules/,
			failOnError: true
		})
	]
};

module.exports = devConfig;
