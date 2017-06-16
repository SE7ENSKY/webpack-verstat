// const webpackDevMiddleware = require('webpack-dev-middleware');
// const webpackHotMiddleware = require('webpack-hot-middleware');
// const browserSync = require('browser-sync').create();
//
//
// const compiler = webpack(webpackConfig);
// const webpackDevMiddlewareInstance = webpackDevMiddleware(compiler, devServerConfig);
//
// const handleFile = (event) => {
//   if (event === 'add' || 'change' || 'unlink') {
//     webpackDevMiddlewareInstance.invalidate();
//     webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
//   }
// };
//
// const handleLayout = (event) => {
//   switch (event) {
//     case 'add':
//     case 'unlink':
//       webpackDevMiddlewareInstance.invalidate();
//       webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
//       break;
//     case 'change':
//       webpackDevMiddlewareInstance.waitUntilValid(() => browserSync.reload());
//       break;
//   }
// };
//
// browserSync.init({
//   ui: false,
//   open: false,
//   notify: false,
//   reloadOnRestart: true,
//   watchOptions: {
//     ignoreInitial: true
//   },
//   port: devServerConfig.port,
//   server: {
//     baseDir: `${basePath}/dist`,
//     serveStaticOptions: {
//       extensions: ['html']
//     },
//     middleware: [
//       webpackDevMiddlewareInstance,
//       webpackHotMiddleware(compiler)
//     ]
//   },
//   files: [
//     {
//       match: [`${basePath}/config/webpack.*.js`],
//       fn: (event, file) => handleFile(event)
//     },
//     {
//       match: [`${basePath}/src/blocks/**/*.?(pug|jade)`],
//       fn: (event, file) => handleFile(event)
//     },
//     {
//       match: [`${basePath}/src/data/*.?(json|yml)`],
//       fn: (event, file) => handleFile(event)
//     },
//     {
//       match: [`${basePath}/src/globals/commons.?(pug|jade)`],
//       fn: (event, file) => handleFile(event)
//     },
//     {
//       match: [`${basePath}/src/layouts/*.?(pug|jade)`],
//       fn: (event, file) => handleFile(event)
//     },
//     {
//       match: [`${basePath}/src/*.?(pug|jade)`],
//       fn: (event, file) => handleFile(event)
//     }
//   ]
// });
