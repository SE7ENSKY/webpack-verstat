const { SUPPORTED_BROWSERS_LIST } = require('../bin/core');


module.exports = {
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
