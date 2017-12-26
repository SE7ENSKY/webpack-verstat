module.exports = {
	colors: true,
	modules: false,
	children: false,
	hash: process.env.NODE_ENV === 'production',
	timings: process.env.NODE_ENV === 'production'
};
