function init(options = {}) {
  this.app = options.app || require('express')();
  this.server = require('http').Server(this.app); // eslint-disable-line new-cap
  this.io = require('socket.io')(this.server);
  require('./initDatabase')((mongoose) => {
    this.db = mongoose;
  });
  this.models = {
    user: require('../models/user'),
  };
}

module.exports = init;
