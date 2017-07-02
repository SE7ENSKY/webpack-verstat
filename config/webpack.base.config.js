const { join } = require('path');
const nib = require('nib');
const autoprefixer = require('autoprefixer');
const {
	NoEmitOnErrorsPlugin,
	ProvidePlugin,
	LoaderOptionsPlugin,
	WatchIgnorePlugin,
	DefinePlugin
} = require('webpack');
// const CopyWebpackPlugin = require('copy-webpack-plugin');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const {
	projectRoot,
	getModifiedNib,
	initHtmlWebpackPlugin
} = require('./webpack.config.utils');


const baseConfig = {
	context: join(projectRoot, 'src'),
	output: {
		path: join(projectRoot, 'dist')
	},
	target: 'web',
	module: {
		rules: [
			{
				test: /\.(jpg|png|gif|eot|ttf|woff|woff2|svg|mp4|webm)$/,
				use: {
					loader: 'file-loader',
					options: {
						regExp: '\\b(assets.+)',
						name: '[1]'
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
		new DefinePlugin({
			'process.env': {
				NODE_ENV: JSON.stringify(process.env.NODE_ENV)
			}
		}),
		...initHtmlWebpackPlugin(),
		new NoEmitOnErrorsPlugin(),
		new ProvidePlugin({
			$: 'jquery',
			jQuery: 'jquery'
		}),
		// new CopyWebpackPlugin([
		//	 { from: `${projectRoot}/src/assets/fonts`, to: `${projectRoot}/dist/assets/fonts` },
		//	 { from: `${projectRoot}/src/assets/img`, to: `${projectRoot}/dist/assets/img` },
		//	 { from: `${projectRoot}/src/assets/video`, to: `${projectRoot}/dist/assets/video` }
		// ]),
		new LoaderOptionsPlugin({
			options: {
				stylus: {
					use: [nib()],
					import: [getModifiedNib(require.resolve('verstat-nib'))],
					preferPathResolver: 'webpack'
				},
				postcss: [
					autoprefixer({
						browsers: [
							'last 4 versions',
							'ie >= 10'
						]
					})
				]
			}
		}),
		new WatchIgnorePlugin([join(projectRoot, 'node_modules')]),
		new CircularDependencyPlugin({
			exclude: /node_modules/,
			failOnError: true
		})
	]
};

module.exports = baseConfig;
