const { join } = require('path');
const nib = require('nib');
const cssNext = require('postcss-cssnext');
const cssMQPacker = require('css-mqpacker');
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
	projectRoot,
	generateEntry,
	getModifiedNib,
	initHtmlWebpackPlugin
} = require('../bin/utils');


const devConfig = {
	context: join(projectRoot, 'src'),
	entry: generateEntry('webpack-hot-middleware/client'),
	output: {
		path: '/',
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
				include: [
					join(projectRoot, 'node_modules'),
					join(projectRoot, 'src', 'vendor')
				],
				use: 'url-loader'
			},
			{
				test: /\.(jpg|png|gif|eot|ttf|woff|woff2|svg|mp4|webm)$/,
				exclude: [
					join(projectRoot, 'node_modules'),
					join(projectRoot, 'src', 'vendor')
				],
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
										browsers: [
											'last 4 versions',
											'ie >= 10'
										]
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
		...initHtmlWebpackPlugin(),
		new NoEmitOnErrorsPlugin(),
		new ProvidePlugin({
			$: 'jquery',
			jQuery: 'jquery'
		}),
		new HotModuleReplacementPlugin(),
		new CopyWebpackPlugin([
			{
				from: join(projectRoot, 'src', 'assets', 'fonts'),
				to: join(projectRoot, 'dist', 'assets', 'fonts')
			},
			{
				from: join(projectRoot, 'src', 'assets', 'img'),
				to: join(projectRoot, 'dist', 'assets', 'img')
			},
			{
				from: join(projectRoot, 'src', 'assets', 'video'),
				to: join(projectRoot, 'src', 'assets', 'video')
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
							browsers: [
								'last 4 versions',
								'ie >= 10'
							]
						}
					}),
					cssMQPacker()
				]
			}
		}),
		new WatchIgnorePlugin([join(projectRoot, 'node_modules')]),
		new CircularDependencyPlugin({
			exclude: /node_modules/,
			failOnError: true
		})
	]
};

module.exports = devConfig;
