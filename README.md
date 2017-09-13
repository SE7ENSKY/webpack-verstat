# Verstat v2
Release candidate

NOTE: all paths in css and html start with a sign ```/``` . On Linux [nodemon](https://github.com/remy/nodemon) restarts only once due bug with [chokidar](https://github.com/paulmillr/chokidar). For [Modernizr](https://github.com/Modernizr/Modernizr) we use [modernizr-loader](https://github.com/peerigon/modernizr-loader).

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
 4. Code splitting
 5. Hot Reloading
 6. happypack
 7. Babel/ECMAScript 6+
 8. ESLint
 9. nodemon
10. UglifyJS
11. nib
12. Autoprefixer
13. cssnext
14. perfectionist
15. CSS MQPacker
16. cssnano
17. bemto
18. Browsersync
19. yarn
20. Modernizr
21. Critical CSS
```

**Requirements**

```
node: ^7.0.0
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
yarn dev

// npm
npm run dev
```
```
// only for production, read-only, server on localhost:3000
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

**Project structure**
```
verstat // project name
├── bin 
│   ├── dev.server.js
│   ├── prod.server.js
│   └── utils.js
├── config
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
│   │   └── text.yml
│   ├── globals
│   │   ├── commons.pug
│   │   ├── functions.styl
│   │   ├── mixins.styl
│   │   └── variables.styl
│   ├── layouts
│   │   ├── frontPage.pug
│   │   ├── main.pug
│   │   └── root.pug
│   ├── letters
│   ├── pages // read-only
│   ├── vendor // legacy code
│   ├── index.pug
│   ├── sitegrid.pug
│   └── styles.pug
├── .eslintignore
├── .eslintrc
├── .gitignore
├── .modernizrrc
├── package.json
├── README.md
└── yarn.lock
```
