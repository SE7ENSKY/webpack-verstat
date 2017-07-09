const { join } = require('path');
const nib = require('nib');
const autoprefixer = require('autoprefixer');
const {
	HotModuleReplacementPlugin,
	NoEmitOnErrorsPlugin,
	ProvidePlugin,
	LoaderOptionsPlugin,
	WatchIgnorePlugin,
	DefinePlugin
} = require('webpack');
// const CopyWebpackPlugin = require('copy-webpack-plugin');
const CircularDependencyPlugin = require('circular-dependency-plugin');
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
	// resolveLoader: {
	// 	modules: ['node_modules', 'custom-loaders']
	// },
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
			},
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
			}
		]
	},
	plugins: [
		new DefinePlugin({
			'process.env': {
				NODE_ENV: JSON.stringify(process.env.NODE_ENV)
			}
		}),
		...initHtmlWebpackPlugin(),
		new NoEmitOnErrorsPlugin(),
		new ProvidePlugin({
			$: 'jquery',
			jQuery: 'jquery'
		}),
		new HotModuleReplacementPlugin(),
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
		new CircularDependencyPlugin({
			exclude: /node_modules/,
			failOnError: true
		})
	]
};

module.exports = devConfig;
