import './styles/main.styl';

if (module.hot) {
	module.hot.accept();
}

const getRequiredfiles = file => file.keys().forEach(file);
getRequiredfiles(require.context('../blocks/', true, /\.(css|styl|less|sass|scss)$/));
getRequiredfiles(require.context('../blocks/', true, /\.(js|coffee)$/));
