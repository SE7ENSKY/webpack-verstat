import './styles/main.styl';

if (module.hot) {
  module.hot.accept();
}

require.context('../blocks/', true, /\.(css|styl|less|sass|scss)$/);
require.context('../blocks/', true, /\.(js|coffe)$/);
