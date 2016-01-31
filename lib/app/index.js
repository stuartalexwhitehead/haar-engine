function engine() {
  if (this.app === null) {
    this.app = require('express')();
  }

  if (this.server === null) {
    this.server = require('http').Server(this.app); // eslint-disable-line new-cap
  }

  if (this.io === null) {
    this.io = require('socket.io')(this.server);
  }

  return this.server;
}

module.exports = engine;
