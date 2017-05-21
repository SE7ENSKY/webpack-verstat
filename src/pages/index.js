// import { requireModules } from '../utils.js';
// import {  } from '../main.js';

if (module.hot) {
  module.hot.accept();
}

import '../styles/main.styl';

import '../components/text/text.styl';
import '../components/footer/footer.js';

// requireModules(
//   require('../layouts/index.pug'),
//   require.context('../components/', true, /\.(css|styl|less|sass|scss)$/)
// );

// requireModules(
//   require('../layouts/index.pug'),
//   require.context('../components/', true, /\.(js|coffe)$/)
// );
