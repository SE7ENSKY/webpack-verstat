const {
	POSTCSS_CONFIG,
	SUPPORTED_BROWSERS_LIST
} = require('../bin/core');


module.exports = {
	sourceMap: true,
	config: {
		path: POSTCSS_CONFIG,
		ctx: {
			cssnext: {
				autoprefixer: {
					browsers: SUPPORTED_BROWSERS_LIST
				}
			}
		}
	}
};
