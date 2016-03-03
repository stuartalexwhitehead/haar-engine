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
const authenticate = require('../controllers/authenticate');
const users = require('../controllers/users');
const deviceTypes = require('../controllers/device-types');
const devices = require('../controllers/devices');
const data = require('../controllers/data');
const rules = require('../controllers/rules');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(decodeJwt);

app.use(authenticate);
app.use(users);
app.use(deviceTypes);
app.use(devices);
app.use(data);
app.use(rules);

function init() {
  _.extend(this, {
    app,
    server,
    io,
    db,
  });
}

module.exports = init;
