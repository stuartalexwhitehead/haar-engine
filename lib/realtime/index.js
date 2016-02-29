const decodeJwt = require('./middlewares/decode-jwt');
const inputHandlers = require('./input-handlers');

function init(io) {
  const input = io.of('/input');
  const output = io.of('/output');

  output.use(decodeJwt);
  input.use(decodeJwt);

  input.on('connection', socket => {
    socket.on('data', inputHandlers('data', socket));
  });
}

module.exports = {
  init,
};
