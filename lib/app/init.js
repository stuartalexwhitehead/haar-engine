const _ = require('lodash');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const http = require('http');
const server = http.createServer(app);
const Primus = require('primus');

const db = require('./initDatabase')();
const realtime = require('../realtime');

const primusOptions = {
  transformer: 'engine.io',
};

const io = new Primus(server, primusOptions);
realtime.init(io);

const decodeJwt = require('../middlewares/decode-jwt');
const controllers = require('../controllers');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(decodeJwt);
app.use(controllers);

function init() {
  _.extend(this, {
    app,
    server,
    io,
    db,
  });
}

module.exports = init;
