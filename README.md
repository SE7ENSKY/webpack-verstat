# Verstat v2
The open beta.

**Requirements**

```
node: ^6.0.0
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
// only for development, read/write
// yarn
yarn dev

// npm
npm run dev
```
```
// only for production, read-only, server
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
│   │   ├── fonts
│   │   ├── img
│   │   ├── scripts
│   │   ├── styles
│   │   ├── video
│   │   └── project-name.js // webpack entry, imports
│   ├── blocks
│   ├── data
│   ├── globals
│   │   ├── commons.pug
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
├── package.json
└── README.md
```
