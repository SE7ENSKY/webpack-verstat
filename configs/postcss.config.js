module.exports = ({ file, options, env }) => ({
	plugins: {
		'autoprefixer': options.autoprefixer ? options.autoprefixer : false
	}
});
