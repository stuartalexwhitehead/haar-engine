const mongoose = require('mongoose');

const host = process.env.MONGO_HOST
  || process.env.HAAR_ENGINE_MONGO_PORT_27017_TCP_ADDR
  || '127.0.0.1';
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

console.log(`host: ${host}`); // eslint-disable-line no-console

mongoose.connect(uri, options);
mongoose.connection.once('open', () => {
  console.log('DB Connection Open'); // eslint-disable-line no-console
});
mongoose.connection.on('error', err => {
  console.log(err); // eslint-disable-line no-console
});

module.exports = mongoose;
