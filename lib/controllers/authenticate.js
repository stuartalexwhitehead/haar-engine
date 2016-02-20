const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const UserModel = require('../models/user');
const jwt = require('jsonwebtoken');

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

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: req.body.remember ? '14 days' : '1 day',
      });

      res.json({
        status: 'success',
        meta: null,
        data: null,
        token,
      });
    }
  });
});

module.exports = router;
