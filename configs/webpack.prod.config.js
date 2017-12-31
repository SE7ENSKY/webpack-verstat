if (process.env.TIMESTAMP) {
	require('console-stamp')(console, {
		pattern: 'HH:MM:ss',
		label: false
	});
}

const path = require('path');
const nib = require('nib');
const perfectionist = require('perfectionist');
const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const BeautifyHtmlPlugin = require('beautify-html-plugin');
// const ScriptExtHtmlWebpackPlugin = require('script-ext-html-webpack-plugin');
const Visualizer = require('webpack-visualizer-plugin');
const ProgressBarPlugin = require('progress-bar-webpack-plugin');
// const OfflinePlugin = require('offline-plugin');
// const webpackPluginCritical = require('webpack-plugin-critical');
const StylesPostprocessorPlugin = require('styles-postprocessor-plugin');
const {
	PROJECT_ROOT,
	PROD_OUTPUT_DIRECTORY,
	BUNDLE_STATISTICS,
	generateEntry,
	getModifiedNib
	// addHtmlWebpackPlugins
} = require('../bin/core');
const postcssLoaderConfig = require('./postcss.loader.config');
const stylesPostprocessorConfig = require('./styles.postprocessor.config');
const perfectionistConfig = require('./perfectionist.config');
const webpackBaseConfig = require('./webpack.base.config');


// if (!process.env.SOURCEMAP) {
// 	stylesPostprocessorConfig.filter = data => data.replace(/assets\//g, '');
// }

if (!process.env.UGLIFY) {
	stylesPostprocessorConfig.plugins.push(perfectionist(perfectionistConfig));
}

const prodConfig = {
	entry: generateEntry(),
	output: {
		path: PROD_OUTPUT_DIRECTORY,
		publicPath: process.env.SOURCEMAP ? '/' : '',
		filename: `assets/[name]${process.env.UGLIFY ? '.min' : ''}.[chunkhash:8].js`
	},
	devtool: process.env.SOURCEMAP ? 'source-map' : false,
	watch: false,
	module: {
		rules: [
			{
				test: /\.css$/,
				use: ExtractTextPlugin.extract({
					use: [
						'css-loader',
						{
							loader: 'postcss-loader',
							options: postcssLoaderConfig
						},
						{
							loader: 'resolve-url-loader',
							options: { includeRoot: true }
						}
					],
					fallback: 'style-loader'
				})
			},
			{
				test: /\.(sass|scss)$/,
				use: ExtractTextPlugin.extract({
					use: [
						'css-loader',
						{
							loader: 'postcss-loader',
							options: postcssLoaderConfig
						},
						{
							loader: 'resolve-url-loader',
							options: { includeRoot: true }
						},
						{
							loader: 'sass-loader',
							options: { sourceMap: true }
						}
					],
					fallback: 'style-loader'
				})
			},
			{
				test: /\.less$/,
				use: ExtractTextPlugin.extract({
					use: [
						'css-loader',
						{
							loader: 'postcss-loader',
							options: postcssLoaderConfig
						},
						{
							loader: 'resolve-url-loader',
							options: { includeRoot: true }
						},
						{
							loader: 'less-loader',
							options: { sourceMap: true }
						}
					],
					fallback: 'style-loader'
				})
			},
			{
				test: /\.styl$/,
				use: ExtractTextPlugin.extract({
					use: [
						'css-loader',
						{
							loader: 'postcss-loader',
							options: postcssLoaderConfig
						},
						{
							loader: 'resolve-url-loader',
							options: { includeRoot: true }
						},
						{
							loader: 'stylus-loader',
							options: {
								sourceMap: true,
								use: nib(),
								import: [
									path.join(PROJECT_ROOT, 'src', 'globals', 'variables.styl'),
									path.join(PROJECT_ROOT, 'src', 'globals', 'mixins.styl'),
									getModifiedNib(require.resolve('verstat-nib'))
								],
								preferPathResolver: 'webpack'
							}
						}
					],
					fallback: 'style-loader'
				})
			}
		]
	},
	plugins: [
		new ExtractTextPlugin({
			filename: `assets/[name]${process.env.UGLIFY ? '.min' : ''}.[chunkhash:8].css`,
			allChunks: true
		}),
		// new ScriptExtHtmlWebpackPlugin({
		// 	defaultAttribute: 'defer'
		// }),
		// new webpack.optimize.CommonsChunkPlugin({
		// 	name: gererateVendor(),
		// 	filename: `assets/${gererateVendor()}${process.env.UGLIFY ? '.min' : ''}.[chunkhash:8].js`,
		// 	minChunks: (module, count) => (/node_modules/.test(module.resource) || /vendor/.test(module.resource)) && count >= 1
		// }),
		new BeautifyHtmlPlugin({ ocd: true }),
		new StylesPostprocessorPlugin(stylesPostprocessorConfig),
		// ...addHtmlWebpackPlugins(PROD_OUTPUT_DIRECTORY)
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
		mangle: { screw_ie8: true },
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
	prodConfig.plugins.push(new ProgressBarPlugin({
		width: 40,
		summary: false
	}));
}

// if (process.env.NODE_ENV === 'production') {
// 	prodConfig.plugins.push(new OfflinePlugin({
// 		caches: {
// 			main: [
// 				'**/*.css',
// 				'**/*.js'
// 			],
// 			additional: [ '**/*.*' ]
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

module.exports = webpackMerge(webpackBaseConfig, prodConfig);
