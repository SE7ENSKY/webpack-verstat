const { join } = require('path');
const {
	DefinePlugin,
	NoEmitOnErrorsPlugin,
	ProvidePlugin,
	WatchIgnorePlugin
} = require('webpack');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const {
	PROJECT_ROOT,
	ASSETS_NAMING_CONVENTION
} = require('../bin/core');
const babelLoaderConfig = require('./babel.loader.config');


const baseConfig = {
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
				use: 'file-loader'
			},
			{
				test: /\.(jpg|png|gif|eot|ttf|woff|woff2|svg|mp4|webm)$/,
				exclude: [
					join(PROJECT_ROOT, 'node_modules'),
					join(PROJECT_ROOT, 'src', 'vendor')
				],
				use: 'file-loader'
			},
			{
				test: /\.json$/,
				use: 'json-loader'
			},
			{
				test: /\.(yaml|yml)$/,
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
				use: [
					{
						loader: 'babel-loader',
						options: babelLoaderConfig
					},
					'coffee-loader'
				]
			},
			{
				test: /\.js$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
					options: babelLoaderConfig
				}
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
			}
		]),
		new WatchIgnorePlugin([join(PROJECT_ROOT, 'node_modules')]),
		new CircularDependencyPlugin({
			exclude: /node_modules/,
			failOnError: true
		})
	]
};

module.exports = baseConfig;
