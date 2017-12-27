if (process.env.TIMESTAMP) {
	require('console-stamp')(console, {
		pattern: 'HH:MM:ss',
		label: false
	});
}

const path = require('path');
const _ = require('lodash');
const nib = require('nib');
const cssMQpacker = require('css-mqpacker');
const perfectionist = require('perfectionist');
const cssNano = require('cssnano');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const BeautifyHtmlPlugin = require('beautify-html-plugin');
// const ScriptExtHtmlWebpackPlugin = require('script-ext-html-webpack-plugin');
const Visualizer = require('webpack-visualizer-plugin');
// const OfflinePlugin = require('offline-plugin');
// const webpackPluginCritical = require('webpack-plugin-critical');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const StylesPostprocessorPlugin = require('styles-postprocessor-plugin');
const HappyPack = require('happypack');
const cssnanoBaseConfig = require('./cssnano.base.config');
const cssnanoMinifyConfig = require('./cssnano.minify.config');
const perfectionistConfig = require('./perfectionist.config');
const happyThreadPool = HappyPack.ThreadPool({ size: 4 });
const {
	PROJECT_ROOT,
	ASSETS_NAMING_CONVENTION,
	BUNDLE_STATISTICS,
	PROD_OUTPUT_DIRECTORY,
	POSTCSS_CONFIG,
	SUPPORTED_BROWSERS_LIST,
	generateEntry,
	// gererateVendor,
	getModifiedNib,
	addHtmlWebpackPlugins
} = require('../bin/core');


const stylesPostprocessorConfig = {
	root: PROJECT_ROOT,
	output: PROD_OUTPUT_DIRECTORY,
	plugins: [
		cssMQpacker(),
		cssNano(_.merge({}, cssnanoBaseConfig, process.env.UGLIFY ? cssnanoMinifyConfig : {})
		)
	]
};

if (!process.env.UGLIFY) {
	stylesPostprocessorConfig.plugins.push(perfectionist(perfectionistConfig));
}

const fileLoaderExclude = [
	path.join(PROJECT_ROOT, 'node_modules'),
	path.join(PROJECT_ROOT, 'src', 'vendor')
];
const urlLoaderInclude = fileLoaderExclude;

const postcssLoaderOptions = {
	sourceMap: !!process.env.SOURCEMAP,
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

const prodConfig = {
	context: path.join(PROJECT_ROOT, 'src'),
	entry: generateEntry(),
	output: {
		path: PROD_OUTPUT_DIRECTORY,
		publicPath: '/',
		filename: `assets/[name]${process.env.UGLIFY ? '.min' : ''}.[chunkhash:8].js`
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
	devtool: process.env.SOURCEMAP ? 'source-map' : false,
	target: 'web',
	watch: false,
	module: {
		rules: [
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
			},
			{
				test: /\.css$/,
				use: ExtractTextPlugin.extract({
					use: 'happypack/loader?id=css',
					fallback: ['style-loader']
				})
			},
			{
				test: /\.(sass|scss)$/,
				use: ExtractTextPlugin.extract({
					use: 'happypack/loader?id=sass',
					fallback: ['style-loader']
				})
			},
			{
				test: /\.less$/,
				use: ExtractTextPlugin.extract({
					use: 'happypack/loader?id=less',
					fallback: ['style-loader']
				})
			},
			{
				test: /\.styl$/,
				use: ExtractTextPlugin.extract({
					use: 'happypack/loader?id=stylus',
					fallback: ['style-loader']
				})
			}
		]
	},
	plugins: [
		new webpack.DefinePlugin({
			'process.env': {
				NODE_ENV: JSON.stringify(process.env.NODE_ENV)
			}
		}),
		new ExtractTextPlugin({
			filename: `assets/[name]${process.env.UGLIFY ? '.min' : ''}.[chunkhash:8].css`,
			allChunks: true
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
				'css-loader',
				{
					path: 'postcss-loader',
					query: postcssLoaderOptions
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
				'css-loader',
				{
					path: 'postcss-loader',
					query: postcssLoaderOptions
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
			id: 'stylus',
			verbose: false,
			threadPool: happyThreadPool,
			loaders: [
				'css-loader',
				{
					path: 'postcss-loader',
					query: postcssLoaderOptions
				},
				{
					path: 'stylus-loader',
					query: {
						sourceMap: !!process.env.SOURCEMAP,
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
		// new ScriptExtHtmlWebpackPlugin({
		// 	defaultAttribute: 'defer'
		// }),
		new webpack.NoEmitOnErrorsPlugin(),
		new webpack.ProvidePlugin({
			$: 'jquery',
			jQuery: 'jquery',
			'window.jQuery': 'jquery'
		}),
		// new webpack.optimize.CommonsChunkPlugin({
		// 	name: gererateVendor(),
		// 	filename: `assets/${gererateVendor()}${process.env.UGLIFY ? '.min' : ''}.[chunkhash:8].js`,
		// 	minChunks: (module, count) => (/node_modules/.test(module.resource) || /vendor/.test(module.resource)) && count >= 1
		// }),
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
		new BeautifyHtmlPlugin({ ocd: true }),
		new StylesPostprocessorPlugin(stylesPostprocessorConfig),
		...addHtmlWebpackPlugins(PROD_OUTPUT_DIRECTORY)
		// new webpackPluginCritical.CriticalPlugin({
		// 	src: 'index.html',
		// 	inline: true,
		// 	minify: true,
		// 	extract: false,
		// 	dest: 'index.html'
		// })
	]
};

if (process.env.UGLIFY) {
	prodConfig.plugins.push(new webpack.optimize.UglifyJsPlugin({
		sourceMap: true,
		mangle: {
			screw_ie8: true
		},
		comments: false,
		compress: {
			screw_ie8: true,
			warnings: false
		}
	}));
}

if (process.env.SOURCEMAP) {
	prodConfig.plugins.push(new Visualizer({
		filename: `.${BUNDLE_STATISTICS.url}`
	}));
}

// if (process.env.NODE_ENV === 'production') {
// 	prodConfig.plugins.push(new OfflinePlugin({
// 		caches: {
// 			main: [
// 				'**/*.css',
// 				'**/*.js'
// 			],
// 			additional: [
// 				'**/*.*'
// 			]
// 		},
// 		excludes: [
// 			'**/*.map',
// 			'**/bundle-statistics.html',
// 			'**/sitegrid.html',
// 			'**/styles.html'
// 		],
// 		safeToUseOptionalCaches: true,
// 		ServiceWorker: {
// 			navigateFallbackURL: '/',
// 			events: true,
// 			minify: true
// 		},
// 		AppCache: false
// 	}));
// }

module.exports = prodConfig;
