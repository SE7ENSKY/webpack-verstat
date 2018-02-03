# Verstat v2

**NOTE:** All paths in css and html start with a sign ```/``` . For [Modernizr](https://github.com/Modernizr/Modernizr) we use [modernizr-loader](https://github.com/peerigon/modernizr-loader). If you encountered error ```[nodemon] clean exit - waiting for changes before restart``` during build process just type ```rs``` in your terminal.

**Languages**
```
 1. HTML
 2. Jade/Pug
 3. MJML
 4. Markdown
 5. CSS
 6. Stylus
 7. SASS/SCSS
 8. LESS
 9. JavaScript
10. CoffeeScript
11. JSON
12. YAML
```

**Features**
```
 1. Multi page applications
 2. Cross-platform build system
 3. Webpack
 4. Critical CSS (webpack-plugin-critical)
 5. Service Worker (offline-plugin, HTTPS protocol needed)
 6. happypack
 7. Babel/ECMAScript 6+
 8. ESLint
 9. nodemon
10. UglifyJS
11. nib
12. Autoprefixer
13. Webpack Visualizer
14. perfectionist
15. CSS MQPacker
16. cssnano
17. bemto
18. Browsersync
19. yarn
20. Modernizr (modernizr-loader)
21. Lazy Loading (lozad)
22. Html validator
```

**Assets naming convention**

```
// bin/core.js
const ASSETS_NAMING_CONVENTION = {
  images: 'i',
  fonts: 'f',
  videos: 'v',
  scripts: 'scripts',
  styles: 'styles'
}
```

**Requirements**

```
node: ^7.6.0
npm: ^4.0.0
```

**Install**

```
// yarn
yarn

// npm
npm i
```

**Use**

```
// only for development, read/write, server on localhost:8080
// yarn
yarn start

// npm
npm run start
```
```
// only for production, read-only, server on localhost:3000, bundle visualizer on bundle-statistics.html
// yarn
yarn prod

// npm
npm run prod
```
```
// only for production, read-only, build
// yarn
yarn build

// npm
npm run build
```
```
// only for production, read-only, uglified build
// yarn
yarn build:min

// npm
npm run build:min
```

```
// only for production, after build or build:min
// yarn
yarn validate

// npm
npm run validate
```

**Project structure**
```
verstat // project name
├── bin 
│   ├── core.js
│   ├── dev.server.js
│   ├── html.validator.js
│   ├── prod.build.js
│   └── prod.server.js
├── configs
│   ├── babel.loader.config.js
│   ├── chokidar.watch.config.js
│   ├── console.output.config.js
│   ├── cssnano.base.config.js
│   ├── cssnano.minify.config.js
│   ├── html.validator.config.js
│   ├── perfectionist.config.js
│   ├── postcss.config.js
│   ├── postcss.loader.config.js
│   ├── styles.postprocessor.config.js
│   ├── webpack.base.config.js
│   ├── webpack.dev.config.js
│   └── webpack.prod.config.js
├── dist
├── src
│   ├── assets
│   │   ├── f // fonts
│   │   ├── i // images
│   │   ├── scripts
│   │   ├── styles
│   │   ├── v // videos
│   │   └── project-name.js // webpack entry, imports
│   ├── blocks
│   │   └── container
│   │       └── container.styl
│   ├── data
│   │   └── text.(yml|yaml)
│   ├── emails // https://www.campaignmonitor.com/css/
│   │   └── email-name-directory
│   │       ├── email-name.(pug|jade|html|mjml)
│   │       └── image.(jpg|png|gif)
│   ├── globals
│   │   ├── commons.(pug|jade)
│   │   ├── functions.styl
│   │   ├── mixins.styl
│   │   └── variables.styl
│   ├── layouts
│   │   ├── frontPage.(pug|jade)
│   │   ├── main.(pug|jade)
│   │   └── root.(pug|jade)
│   ├── letters
│   ├── pages // read-only
│   ├── vendor // for code that is not in npm
│   ├── index.(pug|jade)
│   ├── sitegrid.(pug|jade)
│   └── styles.(pug|jade)
├── .eslintignore
├── .eslintrc
├── .gitignore
├── .modernizrrc
├── package.json
└── README.md
```
