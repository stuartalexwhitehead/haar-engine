require('dotenv').config({ silent: true });

const haar = {
  init: require('./lib/app/init'),
};

module.exports = Object.create(haar);
