const mongoose = require('mongoose');
const config = require('nconf');

function initDatabase(cb) {
  if (mongoose.connection.readyState === 0) {
    const host = config.get('MONGO:HOST');
    const database = config.get('MONGO:DATABASE');
    const username = config.get('MONGO:USERNAME');
    const password = config.get('MONGO:PASSWORD');

    const uri = `mongodb://${host}/${database}`;
    const options = {
      user: username,
      pass: password,
      server: {
        socketOptions: {
          keepAlive: 120,
        },
      },
    };

    mongoose.connect(uri, options);
    if (cb) {
      mongoose.connection.once('open', () => {
        cb(mongoose);
      });
    } else {
      return mongoose;
    }
  } else if (cb) {
    cb(mongoose);
  } else {
    return mongoose;
  }
}

module.exports = initDatabase;
