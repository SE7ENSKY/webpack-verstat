import './styles/main.styl';


if (module.hot) {
	const originalLog = console.log;
	console.log = function () {
		if (arguments[0].indexOf('[HMR]') === -1) {
			return originalLog.apply(console, arguments);
		}
	};
	module.hot.accept();
}

const getRequiredfiles = file => file.keys().forEach(file);
getRequiredfiles(require.context('../blocks/', true, /\.(css|styl|less|sass|scss)$/));
getRequiredfiles(require.context('../blocks/', true, /\.(js|coffee)$/));
