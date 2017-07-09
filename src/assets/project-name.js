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

// styles
import 'normalize.css/normalize.css';
import './styles/main.styl';
// import 'node_modules';
// import '../vendor/';


// scripts
// import '../vendor/';
import '../assets/scripts/jquery-select7.coffee';
import '../assets/scripts/main.js';


// blocks
getRequiredfiles(require.context('../blocks/', true, /\.(css|styl|less|sass|scss)$/));
getRequiredfiles(require.context('../blocks/', true, /\.(js|coffee)$/));
