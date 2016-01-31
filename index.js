const engine = require('./lib/app');

const haar = {
  app: null,
  server: null,
  io: null,
  engine,
};

module.exports = Object.create(haar);
