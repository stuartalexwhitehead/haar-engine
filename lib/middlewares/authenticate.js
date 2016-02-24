const jwt = require('jsonwebtoken');
const config = require('../app/config');

function authenticate(req, res, next) {
  const token = req.body.token || req.query.token || req.headers['x-access-token'];

  if (!token) {
    return res.status(403).json({
      status: 'fail',
      meta: {
        message: 'No token was provided.',
      },
      data: null,
    });
  }

  jwt.verify(token, config.jwt.secret, (err, decoded) => {
    if (err) {
      return res.json({
        status: 'fail',
        meta: {
          message: 'Failed to validate token.',
        },
        data: null,
      });
    }

    req.jwt = decoded; // eslint-disable-line no-param-reassign
    next();
  });
}

module.exports = authenticate;
