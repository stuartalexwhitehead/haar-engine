const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const jwt = require('jsonwebtoken');
const config = require('nconf');

const UserModel = require('../models/user');
const resHelpers = require('./helpers/response-helpers');

function getFutureDate(seconds) {
  const now = new Date();
  const future = new Date(now.getTime() + (seconds * 1000));
  return future.toISOString();
}

// Authenticate a user
router.post('/authenticate', (req, res) => {
  const { username, password } = req.body;

  UserModel.findOne({ username }, (err, user) => {
    if (err) {
      return res.json(resHelpers.error('Authentication error.'));
    }

    if (!user) {
      return res.json(resHelpers.fail(
        'Authentication not possible - username not found.',
        null,
        {
          validation: {
            errors: {
              username: 'That username could not be found',
            },
            values: {
              username,
            },
          },
        }
      ));
    }

    user.comparePassword(password, (matchErr, isMatch) => {
      if (!isMatch) {
        return res.json(resHelpers.fail(
          'Authentication not possible.',
          null,
          {
            validation: {
              errors: {
                password: 'The password is incorrect.',
              },
              values: {
                username,
              },
            },
          }
        ));
      }

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

      res.json(resHelpers.success(
        'Authentication successful.',
        {
          token,
          expires: getFutureDate(expiresIn),
          user: user.toObject({
            transform: (doc, ret) => {
              delete ret.__v; // eslint-disable-line no-param-reassign
              delete ret.password; // eslint-disable-line no-param-reassign
            },
          }),
        }
      ));
    });
  });
});

module.exports = router;
