const pathJoin = require('path').join;
const nib = require('nib');
const autoprefixer = require('autoprefixer');
const webpackNoEmitOnErrorsPlugin = require('webpack').NoEmitOnErrorsPlugin;
const webpackProvidePlugin = require('webpack').ProvidePlugin;
const webpackLoaderOptionsPlugin = require('webpack').LoaderOptionsPlugin;
const webpackWatchIgnorePlugin = require('webpack').WatchIgnorePlugin;
const webpackDefinePlugin = require('webpack').DefinePlugin;
// const CopyWebpackPlugin = require('copy-webpack-plugin');
const CircularDependencyPlugin = require('circular-dependency-plugin');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const configUtils = require('./webpack.config.utils');


const baseConfig = {
	context: pathJoin(configUtils.projectRoot, 'src'),
	output: {
		path: pathJoin(configUtils.projectRoot, 'dist')
	},
	target: 'web',
	module: {
		rules: [
			{
				test: /\.(jpg|png|gif|eot|ttf|woff|woff2|svg|mp4|webm)$/,
				use: {
					loader: 'file-loader',
					options: {
						name: '[name].[ext]'
					}
				}
			},
			{
				test: /\.txt$/,
				use: 'raw-loader'
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
				test: /\.(pug|jade)$/,
				use: 'pug-loader'
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
			}
		]
	},
	plugins: [
		// new BundleAnalyzerPlugin(), // bundle analyzer
		new webpackDefinePlugin({
			'process.env': {
				NODE_ENV: JSON.stringify(process.env.NODE_ENV)
			}
		}),
		...configUtils.getCompiledTemplate(),
		new webpackNoEmitOnErrorsPlugin(),
		new webpackProvidePlugin({
			$: 'jquery',
			jQuery: 'jquery'
		}),
		// new CopyWebpackPlugin([
		//	 { from: `${projectRoot}/src/assets/fonts`, to: `${projectRoot}/dist/assets/fonts` },
		//	 { from: `${projectRoot}/src/assets/img`, to: `${projectRoot}/dist/assets/img` },
		//	 { from: `${projectRoot}/src/assets/video`, to: `${projectRoot}/dist/assets/video` }
		// ]),
		new webpackLoaderOptionsPlugin({
			options: {
				stylus: {
					use: [nib()],
					import: [configUtils.getNibModification(require.resolve('verstat-nib'))],
					preferPathResolver: 'webpack'
				},
				postcss: [
					autoprefixer({
						browsers: ['last 5 versions']
					})
				]
			}
		}),
		new webpackWatchIgnorePlugin([pathJoin(configUtils.projectRoot, 'node_modules')]),
		new CircularDependencyPlugin({
			exclude: /node_modules/,
			failOnError: true
		})
	]
};

module.exports = baseConfig;
