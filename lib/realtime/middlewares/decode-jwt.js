const jwt = require('jsonwebtoken');

const config = require('../../app/config');

function decodeJwt(socket, next) {
  const encodedToken = socket.handshake.query.token;

  if (!encodedToken) {
    return next(new Error('No token was provided'));
  }

  if (encodedToken) {
    jwt.verify(encodedToken, config.jwt.secret, (err, decoded) => {
      if (err) {
        return next(new Error('The token could not be validated.'));
      }

      socket.jwt = decoded; // eslint-disable-line no-param-reassign
      next();
    });
  }
}

module.exports = decodeJwt;
