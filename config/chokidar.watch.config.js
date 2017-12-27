module.exports = {
	ignored: ['.DS_Store'],
	ignoreInitial: true,
	usePolling: true,
	interval: 100,
	binaryInterval: 300,
	awaitWriteFinish: {
		stabilityThreshold: 2000,
		pollInterval: 100
	}
};
