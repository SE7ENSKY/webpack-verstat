const express = require("express");
const compression = require("compression");
const app = express();

app.set('port', process.env.PORT || 3000);
app.use(compression({ threshold: 1024 }));

app.get('/*', function (req, res, next) {
  if (req.url.indexOf("/assets/") === 0) {
    res.setHeader("Cache-Control", "public, max-age=2592000");
    res.setHeader("Expires", new Date(Date.now() + 2592000000).toUTCString());
  }
  next();
});

app.use(express.static(__dirname + '/dist', {
    extensions: ['html']
}));

app.use((req, res, next) => {
	res.status(404);
	res.redirect('/404.html');
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(app.get('port'), () => {
	console.log('Node app is running on port ' + app.get('port'));
});
