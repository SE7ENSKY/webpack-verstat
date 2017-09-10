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

// ------------------ import vendor styles -------------------
import 'normalize.css/normalize.css';

// ------------------ import system styles -------------------
// import 'fonts/';
import 'styles/main.styl';

// ------------------ import vendor scripts ------------------
// import 'vendor/';

// ----------------- import system scripts -------------------
import 'scripts/jquery-select7.coffee';
import 'scripts/main.coffee';

// ------------------ import system blocks -------------------
getRequiredfiles(require.context('../blocks/', true, /\.(css|styl|less|sass|scss)$/));
getRequiredfiles(require.context('../blocks/', true, /\.(js|coffee)$/));
