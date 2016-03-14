const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const jwt = require('jsonwebtoken');
const config = require('nconf');

const UserModel = require('../models/user');

function getFutureDate(seconds) {
  const now = new Date();
  const future = new Date(now.getTime() + (seconds * 1000));
  return future.toISOString();
}

// Authenticate a user
router.post('/authenticate', (req, res) => {
  UserModel.findOne({ username: req.body.username }, (err, user) => {
    if (err) {
      throw err;
    }

    if (!user) {
      res.json({
        status: 'fail',
        meta: {
          message: 'Authentication not possible - username not found',
          validation: {
            username: 'That username could not be found',
          },
        },
        data: null,
      });
    } else {
      const payload = {
        id: user.id,
        username: user.username,
        name: user.name.full,
        role: user.role,
      };

      const expiresIn = req.body.remember ? 1209600 : 86400;

      const token = jwt.sign(payload, config.get('JWT:SECRET'), {
        expiresIn,
      });

      res.json({
        status: 'success',
        meta: null,
        data: {
          token,
          expires: getFutureDate(expiresIn),
          user: user.toObject({
            transform: (doc, ret) => {
              delete ret.__v; // eslint-disable-line no-param-reassign
              delete ret.password; // eslint-disable-line no-param-reassign
            },
          }),
        },
      });
    }
  });
});

module.exports = router;
