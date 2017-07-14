if (process.env.TIMESTAMP) {
	require('console-stamp')(console, {
		pattern: 'HH:MM:ss',
		label: false
	});
}

const { join } = require('path');
const nib = require('nib');
const cssNext = require('postcss-cssnext');
const cssMQpacker = require('css-mqpacker');
const perfectionist = require('perfectionist');
const cssnano = require('cssnano');
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
const CopyWebpackPlugin = require('copy-webpack-plugin');
const StylesPostprocessorPlugin = require('styles-postprocessor-plugin');
const {
	projectRoot,
	generateEntry,
	gererateVendor,
	getModifiedNib,
	initHtmlWebpackPlugin
} = require('../bin/utils');


const cssNanoMinimizeConfig = {
	discardComments: {
		removeAll: true
	},
	normalizeWhitespace: true
};

const cssNanoBaseConfig = {
	autoprefixer: false,
	rawCache: true,
	calc: false,
	colormin: false,
	convertValues: false,
	discardComments: false,
	discardDuplicates: true,
	discardEmpty: true,
	discardOverridden: false,
	discardUnused: false,
	mergeIdents: false,
	mergeLonghand: false,
	mergeRules: true,
	minifyFontValues: {
		removeAfterKeyword: false,
		removeDuplicates: true,
		removeQuotes: false
	},
	minifyGradients: false,
	minifyParams: false,
	minifySelectors: false,
	normalizeCharset: false,
	normalizeDisplayValues: false,
	normalizePositions: false,
	normalizeRepeatStyle: false,
	normalizeString: false,
	normalizeTimingFunctions: false,
	normalizeUnicode: false,
	normalizeUrl: false,
	normalizeWhitespace: false,
	orderedValues: true,
	reduceIdents: false,
	reduceInitial: false,
	reduceTransforms: false,
	svgo: false,
	uniqueSelectors: true,
	zindex: false
};

const perfectionistConfig = {
	cascade: true,
	colorCase: 'lower',
	colorShorthand: false,
	format: 'expanded',
	indentChar: ' ',
	indentSize: 2,
	trimLeadingZero: false,
	trimTrailingZeros: true,
	maxAtRuleLength: false,
	maxSelectorLength: 1,
	maxValueLength: false,
	sourcemap: false,
	zeroLengthNoUnit: true
};

const stylesPostprocessorConfig = {
	root: projectRoot,
	output: join(projectRoot, 'dist'),
	plugins: [
		cssMQpacker(),
		cssnano(Object.assign(cssNanoBaseConfig, process.env.UGLIFY ? cssNanoMinimizeConfig : {}))
	]
};

if (!process.env.UGLIFY) {
	stylesPostprocessorConfig.plugins.push(perfectionist(perfectionistConfig));
}

const prodConfig = {
	context: join(projectRoot, 'src'),
	entry: generateEntry(),
	output: {
		path: join(projectRoot, 'dist'),
		publicPath: '/',
		filename: `assets/[name]${process.env.UGLIFY ? '.min' : ''}.js`
	},
	devtool: false,
	target: 'web',
	watch: false,
	module: {
		rules: [
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
			},
			{
				test: /\.css$/,
				use: ExtractTextPlugin.extract({
					use: [
						'css-loader',
						'postcss-loader'
					],
					fallback: ['style-loader']
				})
			},
			{
				test: /\.(sass|scss)$/,
				use: ExtractTextPlugin.extract({
					use: [
						'css-loader',
						'postcss-loader',
						'sass-loader'
					],
					fallback: ['style-loader']
				})
			},
			{
				test: /\.less$/,
				use: ExtractTextPlugin.extract({
					use: [
						'css-loader',
						'postcss-loader',
						'less-loader'
					],
					fallback: ['style-loader']
				})
			},
			{
				test: /\.styl$/,
				use: ExtractTextPlugin.extract({
					use: [
						'css-loader',
						'postcss-loader',
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
				NODE_ENV: process.env.NODE_ENV
			}
		}),
		new ExtractTextPlugin({
			filename: `assets/[name]${process.env.UGLIFY ? '.min' : ''}.css`,
			allChunks: true
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
			['dist'],
			{
				root: projectRoot,
				verbose: false,
				dry: false,
				watch: false
			}
		),
		new CommonsChunkPlugin({
			name: gererateVendor(),
			minChunks: ({ resource }) => (/node_modules/.test(resource)) || (/vendor/.test(resource))
		}),
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
							browsers: [
								'last 4 versions',
								'ie >= 10'
							]
						}
					})
				]
			}
		}),
		new WatchIgnorePlugin([join(projectRoot, 'node_modules')]),
		new BeautifyHtmlPlugin({ ocd: true }),
		new StylesPostprocessorPlugin(stylesPostprocessorConfig)
	]
};

if (process.env.UGLIFY) {
	prodConfig.plugins.push(new UglifyJsPlugin({
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

module.exports = prodConfig;
