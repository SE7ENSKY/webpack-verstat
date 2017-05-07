import './styles/main.styl';

const getRequiredfiles = file => file.keys().forEach(file);
getRequiredfiles(require.context('./components/', true, /\.(css|styl|less|sass|scss)$/));
getRequiredfiles(require.context('./components/', true, /\.(js|coffee)$/));
