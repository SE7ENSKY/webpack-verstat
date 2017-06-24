const webpackHotModuleReplacementPlugin = require('webpack').HotModuleReplacementPlugin;
const webpackNamedModulesPlugin = require('webpack').NamedModulesPlugin;
// const webpackCommonsChunkPlugin = require('webpack').optimize.CommonsChunkPlugin;
const webpackMerge = require('webpack-merge');
const baseConfig = require('./webpack.base.config');
const configUtils = require('./webpack.config.utils');


const devConfig = {
	entry: ['webpack-dev-server/client?http://localhost:8080', 'webpack/hot/dev-server', './assets/main.js'],
	output: {
		publicPath: '/',
		filename: 'assets/[name].min.[hash:8].js'
		// chunkFilename: '[name].min.js'
	},
	devtool: 'cheap-module-eval-source-map',
	// externals: {},
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [
					'style-loader',
					'css-loader',
					'resolve-url-loader',
					'postcss-loader'
				]
			},
			{
				test: /\.(sass|scss)$/,
				use: [
					'style-loader',
					'css-loader',
					'postcss-loader',
					'resolve-url-loader',
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
					'resolve-url-loader',
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
					'resolve-url-loader',
					{
						loader: 'stylus-loader',
						options: {
							sourceMap: true
						}
					}
				]
			}
		]
	},
	plugins: [
		new webpackHotModuleReplacementPlugin(),
		new webpackNamedModulesPlugin()
		// new webpackCommonsChunkPlugin({
		//	 name: 'vendor',
		//	 children: true,
		//	 minChunks: 2,
		//	 async: true
		// })
	]
};

module.exports = webpackMerge(baseConfig, devConfig);
