const pathJoin = require('path').join;
const webpackMerge = require('webpack-merge');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const webpackUglifyJsPlugin = require('webpack').optimize.UglifyJsPlugin;
const BeautifyHtmlPlugin = require('../custom-plugins/beautify-html-plugin/index');
const BrowserSyncPlugin = require('browser-sync-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
// const webpackCommonsChunkPlugin = require('webpack').optimize.CommonsChunkPlugin;
const baseConfig = require('./webpack.base.config');
const configUtils = require('./webpack.config.utils');


const prodConfig = {
	entry: ['./assets/main.js'],
	output: {
		publicPath: '/',
		filename: 'assets/[name].min.js'
		// chunkFilename: '[name].min.js'
	},
	devtool: 'source-map',
	watch: true,
	module: {
		rules: [
			{
				test: /\.css$/,
				use: ExtractTextPlugin.extract({
					use: [
						{
							loader: 'css-loader',
							options: {
								minimize: {
									discardComments: {
										removeAll: true
									},
									discardDuplicates: true
								}
							}
						},
						{
							loader: 'resolve-url-loader',
							options: {
								includeRoot: true
							}
						},
						'postcss-loader'
					],
					fallback: ['style-loader']
				})
			},
			{
				test: /\.(sass|scss)$/,
				use: ExtractTextPlugin.extract({
					use: [
						{
							loader: 'css-loader',
							options: {
								minimize: {
									discardComments: {
										removeAll: true
									},
									discardDuplicates: true
								}
							}
						},
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
					],
					fallback: ['style-loader']
				})
			},
			{
				test: /\.less$/,
				use: ExtractTextPlugin.extract({
					use: [
						{
							loader: 'css-loader',
							options: {
								minimize: {
									discardComments: {
										removeAll: true
									},
									discardDuplicates: true
								}
							}
						},
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
					],
					fallback: ['style-loader']
				})
			},
			{
				test: /\.styl$/,
				use: ExtractTextPlugin.extract({
					use: [
						{
							loader: 'css-loader',
							options: {
								minimize: {
									discardComments: {
										removeAll: true
									},
									discardDuplicates: true
								}
							}
						},
						'postcss-loader',
						{
							loader: 'resolve-url-loader',
							options: {
								includeRoot: true
							}
						},
						'stylus-loader'
					],
					fallback: ['style-loader']
				})
			}
		]
	},
	plugins: [
		new ExtractTextPlugin({
			filename: 'assets/[name].min.css',
			allChunks: true
		}),
		new webpackUglifyJsPlugin({
			sourceMap: true,
			mangle: {
				screw_ie8: true
			},
			compress: {
				screw_ie8: true,
				warnings: false
			}
		}),
		new CleanWebpackPlugin(
			[
				// 'dist/**/*.*',
				'dist/**'
			],
			{
				root: configUtils.projectRoot,
				verbose: true,
				dry: false,
				watch: false,
				exclude: ['letters']
			}
		),
		// new webpackCommonsChunkPlugin({
		//	 name: 'vendor',
		//	 children: true,
		//	 minChunks: 2,
		//	 async: true
		// }),
		new BrowserSyncPlugin({
			ui: false, // ?
			open: false,
			notify: false,
			reloadOnRestart: true,
			watchOptions: {
				ignoreInitial: true
			},
			host: 'localhost',
			port: 8080,
			server: {
				baseDir: pathJoin(configUtils.projectRoot, 'dist'),
				serveStaticOptions: {
					extensions: ['html']
				}
			}
		}),
		new BeautifyHtmlPlugin({ ocd: true })
	]
};

module.exports = webpackMerge(baseConfig, prodConfig);
