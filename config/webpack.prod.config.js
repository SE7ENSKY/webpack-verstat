const { join } = require('path');
const nib = require('nib');
const autoprefixer = require('autoprefixer');
const {
	NoEmitOnErrorsPlugin,
	ProvidePlugin,
	LoaderOptionsPlugin,
	WatchIgnorePlugin,
	DefinePlugin,
	optimize: {
		UglifyJsPlugin,
		CommonsChunkPlugin
	}
} = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const BeautifyHtmlPlugin = require('beautify-html-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const ScriptExtHtmlWebpackPlugin = require('script-ext-html-webpack-plugin');
// const CopyWebpackPlugin = require('copy-webpack-plugin');
const {
	projectRoot,
	generateEntry,
	gererateVendor,
	getModifiedNib,
	initHtmlWebpackPlugin
} = require('../bin/utils');


const prodConfig = {
	context: join(projectRoot, 'src'),
	entry: generateEntry(),
	output: {
		path: join(projectRoot, 'dist'),
		publicPath: '/',
		filename: 'assets/[name].min.js'
	},
	devtool: 'source-map',
	target: 'web',
	// resolveLoader: {
	// 	modules: ['node_modules', 'custom-loaders']
	// },
	watch: false,
	module: {
		rules: [
			{
				test: /\.(jpg|png|gif|eot|ttf|woff|woff2|svg|mp4|webm)$/,
				use: {
					loader: 'file-loader',
					options: {
						regExp: '\\b(assets.+)',
						name: '[1]'
					}
				}
			},
			{
				test: /\.txt$/,
				use: 'raw-loader'
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
				use: [
					{
						loader: 'html-loader',
						options: {
							root: join(projectRoot, 'src'),
							attrs: [
								'img:src',
								'source:srcset',
								'img:data-src',
								'img:data-srcset'
							]
						}
					}
					// under construction!
					// {
					// 	loader: 'resolve-inline-css-loader',
					// 	options: {
					// 		root: join(projectRoot, 'src')
					// 	}
					// }
				]
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
			},
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
		new DefinePlugin({
			'process.env': {
				NODE_ENV: JSON.stringify(process.env.NODE_ENV)
			}
		}),
		new ExtractTextPlugin({
			filename: 'assets/[name].min.css',
			allChunks: true
		}),
		new UglifyJsPlugin({
			sourceMap: true,
			mangle: {
				screw_ie8: true
			},
			comments: false,
			compress: {
				screw_ie8: true,
				warnings: false
			}
		}),
		...initHtmlWebpackPlugin(),
		new ScriptExtHtmlWebpackPlugin({
			defaultAttribute: 'defer'
		}),
		new NoEmitOnErrorsPlugin(),
		new ProvidePlugin({
			$: 'jquery',
			jQuery: 'jquery'
		}),
		new CleanWebpackPlugin(
			['dist/*'],
			{
				root: projectRoot,
				verbose: true,
				dry: false,
				watch: false,
				exclude: ['letters']
			}
		),
		new CommonsChunkPlugin({
			name: gererateVendor(),
			minChunks: ({ resource }) => (/node_modules/.test(resource)) || (/vendor/.test(resource))
		}),
		// new CopyWebpackPlugin([
		//	 { from: `${projectRoot}/src/assets/fonts`, to: `${projectRoot}/dist/assets/fonts` },
		//	 { from: `${projectRoot}/src/assets/img`, to: `${projectRoot}/dist/assets/img` },
		//	 { from: `${projectRoot}/src/assets/video`, to: `${projectRoot}/dist/assets/video` }
		// ]),
		new LoaderOptionsPlugin({
			options: {
				stylus: {
					use: [nib()],
					import: [getModifiedNib(require.resolve('verstat-nib'))],
					preferPathResolver: 'webpack'
				},
				postcss: [
					autoprefixer({
						browsers: [
							'last 4 versions',
							'ie >= 10'
						]
					})
				]
			}
		}),
		new WatchIgnorePlugin([join(projectRoot, 'node_modules')]),
		new BeautifyHtmlPlugin({ ocd: true })
	]
};

module.exports = prodConfig;
