const path = require('path');
const webpack = require('webpack');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const {
	PROJECT_ROOT,
	ASSETS_NAMING_CONVENTION
} = require('../bin/core');
const babelLoaderConfig = require('./babel.loader.config');


const baseConfig = {
	context: path.join(PROJECT_ROOT, 'src'),
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
	module: {
		rules: [
			{
				test: /\.(jpe?g|png|gif|ico)$/,
				use: {
					loader: 'file-loader',
					options: { name: 'assets/i/[path][name].[ext]' }
				}
			},
			{
				test: /\.(mp4|webm)$/,
				use: {
					loader: 'file-loader',
					options: { name: 'assets/v/[path][name].[ext]' }
				}
			},
			{
				test: /\.svg$/,
				exclude: [path.join(PROJECT_ROOT, 'src', 'assets', 'f')],
				use: {
					loader: 'file-loader',
					options: { name: 'assets/i/[path][name].[ext]' }
				}
			},
			{
				test: /\.(eot|ttf|woff|woff2|svg)$/,
				include: [path.join(PROJECT_ROOT, 'src', 'assets', 'f')],
				use: {
					loader: 'file-loader',
					options: { name: 'assets/f/[path][name].[ext]' }
				}
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
				use: [
					{
						loader: 'html-loader',
						options: { attrs: [] }
					},
					'markdown-loader'
				]
			},
			{
				test: /\.html$/,
				use: {
					loader: 'html-loader',
					options: { attrs: [] }
				}
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
		new webpack.DefinePlugin({
			'process.env': {
				NODE_ENV: JSON.stringify(process.env.NODE_ENV)
			}
		}),
		new webpack.NoEmitOnErrorsPlugin(),
		new webpack.ProvidePlugin({
			$: 'jquery',
			jQuery: 'jquery',
			'window.jQuery': 'jquery'
		}),
		new webpack.LoaderOptionsPlugin({
			options: {
				customInterpolateName: (url, name, options) => {
					const prefix = name.replace('[path][name].[ext]', '');
					const directory = path.dirname(url).replace(/\\/g, '/').split('/').pop();
					return path.join(
						prefix,
						prefix.replace(/\\/g, '/').split('/').indexOf(directory) === -1 ? directory : '',
						path.basename(url)
					);
				}
			}
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
		new webpack.WatchIgnorePlugin([path.join(PROJECT_ROOT, 'node_modules')]),
		new CircularDependencyPlugin({
			exclude: /node_modules/,
			failOnError: true
		})
	]
};

module.exports = baseConfig;
