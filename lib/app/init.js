const _ = require('lodash');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server);
const db = require('./initDatabase')();

const authenticate = require('../controllers/authenticate');
const users = require('../controllers/users');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(authenticate);
app.use(users);

const models = {
  user: require('../models/user'),
};

function init() {
  _.extend(this, {
    app,
    server,
    io,
    db,
    models,
  });
}

module.exports = init;
