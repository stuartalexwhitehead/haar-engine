const jwt = require('jsonwebtoken');

const config = require('../../app/config');

function decodeJwt(socket, next) {
  const token = socket.query.token;

  if (!token) {
    socket.jwt = null; // eslint-disable-line no-param-reassign
    socket.write({
      status: 'success',
      meta: {
        message: 'You are connected, but only as an anonymous user.',
      },
      data: null,
    });
    next();
  }

  if (token) {
    jwt.verify(token, config.jwt.secret, (err, decoded) => {
      if (err) {
        socket.jwt = null; // eslint-disable-line no-param-reassign
        socket.write({
          status: 'fail',
          meta: {
            message: 'The token could not be verified. You are not authenticated.',
          },
          data: null,
        });
        return next();
      }

      socket.jwt = decoded; // eslint-disable-line no-param-reassign
      socket.write({
        status: 'success',
        meta: {
          message: 'You are connected as an authenticated user.',
        },
        data: null,
      });
      next();
    });
  }
}

module.exports = decodeJwt;
