const { join } = require('path');
const {
	DefinePlugin,
	NoEmitOnErrorsPlugin,
	ProvidePlugin,
	WatchIgnorePlugin,
	BannerPlugin
} = require('webpack');
const HappyPack = require('happypack');
const happyThreadPool = HappyPack.ThreadPool({ size: 4 });
const CircularDependencyPlugin = require('circular-dependency-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const {
	PROJECT_ROOT,
	ASSETS_NAMING_CONVENTION
} = require('../bin/core');
const babelLoaderConfig = require('./babel.loader.config');


const baseConfig = {
	output: {
		publicPath: '/'
	},
	context: join(PROJECT_ROOT, 'src'),
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
	module: {
		rules: [
			{
				test: /\.(jpg|png|gif|eot|ttf|woff|woff2|svg)$/,
				include: [
					join(PROJECT_ROOT, 'node_modules'),
					join(PROJECT_ROOT, 'src', 'vendor')
				],
				use: 'happypack/loader?id=file'
			},
			{
				test: /\.(jpg|png|gif|eot|ttf|woff|woff2|svg|mp4|webm)$/,
				exclude: [
					join(PROJECT_ROOT, 'node_modules'),
					join(PROJECT_ROOT, 'src', 'vendor')
				],
				use: 'happypack/loader?id=file'
			},
			{
				test: /\.json$/,
				use: 'happypack/loader?id=json'
			},
			{
				test: /\.(yaml|yml)$/,
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
				use: 'happypack/loader?id=js'
			},
			{
				test: /\.modernizrrc.js$/,
				use: 'modernizr-loader'
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
		new BannerPlugin({
			banner: '\n' + '@version: 1.0.0' + '\n\n' + '@author: SE7ENSKY Frontend studio <info@se7ensky.com>\n'
		}),
		new NoEmitOnErrorsPlugin(),
		new ProvidePlugin({
			$: 'jquery',
			jQuery: 'jquery',
			'window.jQuery': 'jquery'
		}),
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
			},
			{
				from: 'emails/**/*',
				dot: true,
				ignore: [
					'*.mjml',
					'*.pug',
					'*.jade',
					'*.html',
					'.DS_Store'
				]
			}
		]),
		new WatchIgnorePlugin([join(PROJECT_ROOT, 'node_modules')]),
		new CircularDependencyPlugin({
			exclude: /node_modules/,
			failOnError: true
		}),
		new HappyPack({
			id: 'file',
			verbose: false,
			threadPool: happyThreadPool,
			loaders: ['file-loader']
		}),
		new HappyPack({
			id: 'json',
			verbose: false,
			threadPool: happyThreadPool,
			loaders: ['json-loader']
		}),
		new HappyPack({
			id: 'yaml',
			verbose: false,
			threadPool: happyThreadPool,
			loaders: ['yaml-loader']
		}),
		new HappyPack({
			id: 'markdown',
			verbose: false,
			threadPool: happyThreadPool,
			loaders: ['html-loader', 'markdown-loader']
		}),
		new HappyPack({
			id: 'html',
			verbose: false,
			threadPool: happyThreadPool,
			loaders: ['html-loader']
		}),
		new HappyPack({
			id: 'coffeescript',
			verbose: false,
			threadPool: happyThreadPool,
			loaders: [
				{
					path: 'babel-loader',
					query: babelLoaderConfig
				},
				'coffee-loader'
			]
		}),
		new HappyPack({
			id: 'js',
			verbose: false,
			threadPool: happyThreadPool,
			loaders: [
				{
					path: 'babel-loader',
					query: babelLoaderConfig
				}
			]
		})
	]
};

module.exports = baseConfig;
