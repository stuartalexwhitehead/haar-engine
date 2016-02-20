const mongoose = require('mongoose');

const host = process.env.MONGO_HOST || process.env.MONGO_PORT_27017_TCP_ADDR || '127.0.0.1';
const database = process.env.DATABASE || 'haar';
const uri = `mongodb://${host}/${database}`;
const options = {
  user: process.env.MONGO_USER || null,
  pass: process.env.MONGO_PASSWORD || null,
  server: {
    socketOptions: {
      keepAlive: 120,
    },
  },
};

mongoose.connect(uri, options);

module.exports = mongoose;
