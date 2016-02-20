function init(options = {}) {
  this.app = options.app || require('express')();
  this.server = require('http').Server(this.app); // eslint-disable-line new-cap
  this.io = require('socket.io')(this.server);
  this.db = require('./initDatabase');
  this.models = {
    user: require('../models/user'),
  };
}

module.exports = init;
