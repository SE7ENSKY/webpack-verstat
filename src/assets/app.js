if (module.hot) {
	const originalLog = console.log;
	console.log = function () {
		if (arguments[0].toString().indexOf('[HMR]') === -1) {
			return originalLog.apply(console, arguments);
		}
	};
	module.hot.accept();
}

const getRequiredfiles = file => file.keys().forEach(file);

// ------------------ import vendor styles -------------------
import 'normalize.css/normalize.css';

// ------------------ import system styles -------------------
import 'styles/main.styl';

// ------------------ import vendor scripts ------------------
// import * as OfflinePluginRuntime from 'offline-plugin/runtime';

// ----------------- import system scripts -------------------
import 'scripts/main.coffee';

// ------------------ import system blocks -------------------
getRequiredfiles(require.context('../blocks/', true, /\.(css|styl|less|sass|scss)$/));
getRequiredfiles(require.context('../blocks/', true, /\.(js|coffee)$/));

// service worker support detection and installation code
// if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
// 	OfflinePluginRuntime.install();
// }
