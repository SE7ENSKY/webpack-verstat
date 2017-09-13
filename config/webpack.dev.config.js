const { join } = require('path');
const nib = require('nib');
const {
	HotModuleReplacementPlugin,
	NoEmitOnErrorsPlugin,
	ProvidePlugin,
	WatchIgnorePlugin,
	DefinePlugin
} = require('webpack');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HappyPack = require('happypack');
const happyThreadPool = HappyPack.ThreadPool({ size: 4 });
const {
	ASSETS_NAMING_CONVENTION,
	PROJECT_ROOT,
	DEV_OUTPUT,
	POSTCSS_CONFIG,
	SUPPORTED_BROWSERS_LIST,
	generateEntry,
	getModifiedNib
} = require('../bin/utils');


const fileLoaderExclude = [
	join(PROJECT_ROOT, 'node_modules'),
	join(PROJECT_ROOT, 'src', 'vendor')
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

const devConfig = {
	context: join(PROJECT_ROOT, 'src'),
	entry: generateEntry('webpack-hot-middleware/client'),
	output: {
		path: DEV_OUTPUT,
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
			assets: join(PROJECT_ROOT, 'src', 'assets'),
			f: join(PROJECT_ROOT, 'src', 'assets', ASSETS_NAMING_CONVENTION.fonts),
			i: join(PROJECT_ROOT, 'src', 'assets', ASSETS_NAMING_CONVENTION.images),
			v: join(PROJECT_ROOT, 'src', 'assets', ASSETS_NAMING_CONVENTION.videos),
			scripts: join(PROJECT_ROOT, 'src', 'assets', ASSETS_NAMING_CONVENTION.scripts),
			styles: join(PROJECT_ROOT, 'src', 'assets', ASSETS_NAMING_CONVENTION.styles),
			vendor: join(PROJECT_ROOT, 'src', 'vendor'),
			modernizr$: join(PROJECT_ROOT, '.modernizrrc')
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
			// this.exec() is not supported by HappyPack
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
		new DefinePlugin({
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
							join(PROJECT_ROOT, 'src', 'globals', 'variables.styl'),
							join(PROJECT_ROOT, 'src', 'globals', 'functions.styl'),
							join(PROJECT_ROOT, 'src', 'globals', 'mixins.styl'),
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
			loaders: ['coffee-loader']
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
				query: {
					cacheDirectory: true,
					babelrc: false,
					plugins: [
						'babel-plugin-transform-class-properties',
						'babel-plugin-syntax-dynamic-import',
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
								modules: false,
								loose: true
							}
						]
					]
				}
			}]
		}),
		new NoEmitOnErrorsPlugin(),
		new ProvidePlugin({
			$: 'jquery',
			jQuery: 'jquery',
			'window.jQuery': 'jquery'
		}),
		new HotModuleReplacementPlugin(),
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
		new WatchIgnorePlugin([join(PROJECT_ROOT, 'node_modules')]),
		new CircularDependencyPlugin({
			exclude: /node_modules/,
			failOnError: true
		})
	]
};

module.exports = devConfig;
