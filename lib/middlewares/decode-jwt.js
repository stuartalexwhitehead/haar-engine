const jwt = require('jsonwebtoken');
const config = require('../app/config');

function decodeJwt(req, res, next) {
  const token = req.body.token || req.query.token || req.headers['x-access-token'];

  if (token) {
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
  } else {
    req.jwt = null; // eslint-disable-line no-param-reassign
    next();
  }
}

module.exports = decodeJwt;
