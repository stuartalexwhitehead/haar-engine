const express = require('express');
const app = express();

const authenticate = require('./authenticate');
const users = require('./users');
const deviceTypes = require('./device-types');
const devices = require('./devices');
const data = require('./data');
const rules = require('./rules');

app.use(authenticate);
app.use(users);
app.use(deviceTypes);
app.use(devices);
app.use(data);
app.use(rules);

module.exports = app;
