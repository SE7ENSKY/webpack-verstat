const path = require('path');
const nib = require('nib');
const webpack = require('webpack');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HappyPack = require('happypack');
const happyThreadPool = HappyPack.ThreadPool({ size: 4 });
const {
	ASSETS_NAMING_CONVENTION,
	PROJECT_ROOT,
	DEV_OUTPUT_DIRECTORY,
	POSTCSS_CONFIG,
	SUPPORTED_BROWSERS_LIST,
	generateEntry,
	getModifiedNib
} = require('../bin/core');


const fileLoaderExclude = [
	path.join(PROJECT_ROOT, 'node_modules'),
	path.join(PROJECT_ROOT, 'src', 'vendor')
];
const urlLoaderInclude = fileLoaderExclude;

const postcssLoaderOptions = {
	sourceMap: false,
	config: {
		path: POSTCSS_CONFIG,
		ctx: {
			cssnext: {
				autoprefixer: {
					browsers: SUPPORTED_BROWSERS_LIST
				}
			}
		}
	}
};

const babelLoaderOptions = {
	cacheDirectory: true,
	babelrc: false,
	plugins: [
		'babel-plugin-lodash',
		'babel-plugin-transform-class-properties',
		'babel-plugin-transform-runtime',
		'babel-plugin-transform-object-rest-spread'
	],
	presets: [
		[
			'env',
			{
				targets: {
					browsers: SUPPORTED_BROWSERS_LIST
				},
				modules: false
			}
		]
	]
};

const devConfig = {
	context: path.join(PROJECT_ROOT, 'src'),
	entry: generateEntry([
		'event-source-polyfill',
		'webpack-hot-middleware/client'
	]),
	output: {
		path: DEV_OUTPUT_DIRECTORY,
		publicPath: '/',
		filename: 'assets/[name].js'
	},
	resolve: {
		extensions: [
			'.js',
			'.coffee',
			'.yaml',
			'.json',
			'.css',
			'.sass',
			'.scss',
			'.less',
			'.styl',
			'.png',
			'.jpg',
			'.jpeg',
			'.gif'
		],
		alias: {
			assets: path.join(PROJECT_ROOT, 'src', 'assets'),
			f: path.join(PROJECT_ROOT, 'src', 'assets', ASSETS_NAMING_CONVENTION.fonts),
			i: path.join(PROJECT_ROOT, 'src', 'assets', ASSETS_NAMING_CONVENTION.images),
			v: path.join(PROJECT_ROOT, 'src', 'assets', ASSETS_NAMING_CONVENTION.videos),
			scripts: path.join(PROJECT_ROOT, 'src', 'assets', ASSETS_NAMING_CONVENTION.scripts),
			styles: path.join(PROJECT_ROOT, 'src', 'assets', ASSETS_NAMING_CONVENTION.styles),
			vendor: path.join(PROJECT_ROOT, 'src', 'vendor'),
			modernizr$: path.join(PROJECT_ROOT, '.modernizrrc')
		}
	},
	devtool: 'cheap-module-eval-source-map',
	target: 'web',
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
				use: 'happypack/loader?id=stylus'
			},
			{
				test: /\.(jpg|png|gif|eot|ttf|woff|woff2|svg)$/,
				include: urlLoaderInclude,
				use: 'happypack/loader?id=url'
			},
			{
				test: /\.(jpg|png|gif|eot|ttf|woff|woff2|svg|mp4|webm)$/,
				exclude: fileLoaderExclude,
				use: 'happypack/loader?id=file'
			},
			{
				test: /\.json$/,
				use: 'happypack/loader?id=json'
			},
			{
				test: /\.yaml$/,
				use: 'happypack/loader?id=yaml'
			},
			{
				test: /\.md$/,
				use: 'happypack/loader?id=markdown'
			},
			{
				test: /\.html$/,
				use: 'happypack/loader?id=html'
			},
			{
				test: /\.coffee$/,
				use: 'happypack/loader?id=coffeescript'
			},
			{
				test: /\.js$/,
				exclude: /node_modules/,
				use: 'happypack/loader?id=babel'
			},
			// modernizr-loader is not supported by HappyPack
			// https://github.com/amireh/happypack/wiki/Webpack-Loader-API-Support
			{
				test: /\.modernizrrc.js$/,
				use: ['modernizr-loader']
			},
			{
				test: /\.modernizrrc(\.json)?$/,
				use: ['modernizr-loader', 'json-loader']
			}
		]
	},
	plugins: [
		new webpack.DefinePlugin({
			'process.env': {
				NODE_ENV: JSON.stringify(process.env.NODE_ENV)
			}
		}),
		new HappyPack({
			id: 'markdown',
			verbose: false,
			threadPool: happyThreadPool,
			loaders: [
				'html-loader',
				'markdown-loader'
			]
		}),
		new HappyPack({
			id: 'html',
			verbose: false,
			threadPool: happyThreadPool,
			loaders: ['html-loader']
		}),
		new HappyPack({
			id: 'css',
			verbose: false,
			threadPool: happyThreadPool,
			loaders: [
				'style-loader',
				'css-loader',
				{
					path: 'postcss-loader',
					query: postcssLoaderOptions
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
					query: postcssLoaderOptions
				},
				{
					path: 'sass-loader',
					query: {
						sourceMap: false
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
					query: postcssLoaderOptions
				},
				{
					path: 'less-loader',
					query: {
						sourceMap: false
					}
				}
			]
		}),
		new HappyPack({
			id: 'stylus',
			verbose: false,
			threadPool: happyThreadPool,
			loaders: [
				'style-loader',
				'css-loader',
				{
					path: 'postcss-loader',
					query: postcssLoaderOptions
				},
				{
					path: 'stylus-loader',
					query: {
						sourceMap: false,
						use: nib(),
						import: [
							path.join(PROJECT_ROOT, 'src', 'globals', 'variables.styl'),
							path.join(PROJECT_ROOT, 'src', 'globals', 'functions.styl'),
							path.join(PROJECT_ROOT, 'src', 'globals', 'mixins.styl'),
							getModifiedNib(require.resolve('verstat-nib'))
						],
						preferPathResolver: 'webpack'
					}
				}
			]
		}),
		new HappyPack({
			id: 'yaml',
			verbose: false,
			threadPool: happyThreadPool,
			loaders: ['yaml-loader']
		}),
		new HappyPack({
			id: 'json',
			verbose: false,
			threadPool: happyThreadPool,
			loaders: ['json-loader']
		}),
		new HappyPack({
			id: 'coffeescript',
			verbose: false,
			threadPool: happyThreadPool,
			loaders: [
				{
					path: 'babel-loader',
					query: babelLoaderOptions
				},
				'coffee-loader'
			]
		}),
		new HappyPack({
			id: 'url',
			verbose: false,
			threadPool: happyThreadPool,
			loaders: ['url-loader']
		}),
		new HappyPack({
			id: 'file',
			verbose: false,
			threadPool: happyThreadPool,
			loaders: ['file-loader']
		}),
		new HappyPack({
			id: 'babel',
			verbose: false,
			threadPool: happyThreadPool,
			loaders: [{
				path: 'babel-loader',
				query: babelLoaderOptions
			}]
		}),
		new webpack.NoEmitOnErrorsPlugin(),
		new webpack.ProvidePlugin({
			$: 'jquery',
			jQuery: 'jquery',
			'window.jQuery': 'jquery'
		}),
		new webpack.HotModuleReplacementPlugin(),
		new CopyWebpackPlugin([
			{
				from: 'assets',
				to: 'assets',
				ignore: [
					`${ASSETS_NAMING_CONVENTION.scripts}/*`,
					`${ASSETS_NAMING_CONVENTION.styles}/*`,
					'*.js',
					'.DS_Store'
				]
			}
		]),
		new webpack.WatchIgnorePlugin([path.join(PROJECT_ROOT, 'node_modules')]),
		new CircularDependencyPlugin({
			exclude: /node_modules/,
			failOnError: true
		})
	]
};

module.exports = devConfig;
