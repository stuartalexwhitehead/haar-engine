function init(config = {}) {
  const nconf = require('nconf');
  const path = require('path');
  const _ = require('lodash');
  const express = require('express');
  const app = express();
  const bodyParser = require('body-parser');
  const cors = require('cors');
  const http = require('http');
  const server = http.createServer(app);
  const Primus = require('primus');

  if (typeof config === 'object') {
    nconf.add('supplied', {
      type: 'literal',
      store: config,
    });
  }

  nconf
    .use('memory')
    .env('__')
    .file(path.join(__dirname, 'default.json'));

  const db = require('./initDatabase')();
  const realtime = require('../realtime');

  const primusOptions = {
    transformer: 'engine.io',
  };

  const io = new Primus(server, primusOptions);
  realtime.init(io);

  const decodeJwt = require('../middlewares/decode-jwt');
  const controllers = require('../controllers');

  if (nconf.get('CORS:ORIGIN')) {
    const whitelist = nconf.get('CORS:ORIGIN').split(' ');
    const corsOptions = {
      origin(origin, callback) {
        const isWhitelisted = whitelist.indexOf(origin) !== -1;
        callback(null, isWhitelisted);
      },
    };
    app.use(cors(corsOptions));
  }

  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(decodeJwt);
  app.use(controllers);

  _.extend(this, {
    app,
    server,
    io,
    db,
  });
}

module.exports = init;
