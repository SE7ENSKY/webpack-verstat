const cssMQpacker = require('css-mqpacker');
const cssNano = require('cssnano');
const {
	PROJECT_ROOT,
	PROD_OUTPUT_DIRECTORY
} = require('../bin/core');
const cssnanoBaseConfig = require('./cssnano.base.config');
const cssnanoMinifyConfig = require('./cssnano.minify.config');


module.exports = {
	root: PROJECT_ROOT,
	output: PROD_OUTPUT_DIRECTORY,
	plugins: [
		cssMQpacker(),
		cssNano(Object.assign({}, cssnanoBaseConfig, process.env.UGLIFY ? cssnanoMinifyConfig : {}))
	]
};
