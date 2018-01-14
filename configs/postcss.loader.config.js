const {
	POSTCSS_CONFIG,
	SUPPORTED_BROWSERS_LIST
} = require('../bin/core');


module.exports = {
	sourceMap: !!process.env.SOURCEMAP,
	config: {
		path: POSTCSS_CONFIG,
		ctx: {
			autoprefixer: {
				browsers: SUPPORTED_BROWSERS_LIST
			}
		}
	}
};
