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
const cssNano = require('cssnano');
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
	PROJECT_ROOT,
	PROD_OUTPUT,
	SUPPORTED_BROWSERS_LIST,
	CSS_NANO_BASE_CONFIG,
	CSS_NANO_MINIMIZE_CONFIG,
	PERFECTIONIST_CONFIG,
	generateEntry,
	gererateVendor,
	getModifiedNib,
	initHtmlWebpackPlugin
} = require('../bin/utils');


const stylesPostprocessorConfig = {
	root: PROJECT_ROOT,
	output: PROD_OUTPUT,
	plugins: [
		cssMQpacker(),
		cssNano(Object.assign(CSS_NANO_BASE_CONFIG, process.env.UGLIFY ? CSS_NANO_MINIMIZE_CONFIG : {}))
	]
};

if (!process.env.UGLIFY) {
	stylesPostprocessorConfig.plugins.push(perfectionist(PERFECTIONIST_CONFIG));
}

const fileLoaderExclude = [
	join(PROJECT_ROOT, 'node_modules'),
	join(PROJECT_ROOT, 'src', 'vendor')
];

const urlLoaderInclude = fileLoaderExclude;

const prodConfig = {
	context: join(PROJECT_ROOT, 'src'),
	entry: generateEntry(),
	output: {
		path: PROD_OUTPUT,
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
		...initHtmlWebpackPlugin(PROD_OUTPUT),
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
				root: PROJECT_ROOT,
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
							browsers: SUPPORTED_BROWSERS_LIST
						}
					})
				]
			}
		}),
		new WatchIgnorePlugin([join(PROJECT_ROOT, 'node_modules')]),
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
