const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const async = require('async');

const UserModel = require('../models/user');
const authenticate = require('../middlewares/authenticate');
const authorise = require('../middlewares/authorise');

router.use('/users', authenticate);

// Create user
router.post('/users', authorise('admin'));
router.post('/users', (req, res) => {
  UserModel.create(req.body, (err, user) => {
    if (err) {
      res.json({
        status: 'fail',
        meta: {
          message: 'The user could not be created. Check validation.',
          validation: err.errors,
        },
        data: null,
      });
    } else {
      const userObj = user.toObject();
      delete userObj.password;

      res.json({
        status: 'success',
        meta: {
          message: 'The user was created.',
        },
        data: userObj,
      });
    }
  });
});

// List users
router.get('/users', authorise('user'));
router.get('/users', (req, res) => {
  const page = req.query.page || 1;
  const limit = 20;

  async.parallel({
    total: function total(cb) {
      UserModel.count(cb);
    },
    users: function users(cb) {
      UserModel
        .find()
        .select('name username')
        .skip(limit * (page - 1))
        .limit(limit)
        .lean()
        .exec(cb);
    },
  }, (err, result) => {
    if (err) {
      res.status(500).json({
        status: 'fail',
        meta: {
          message: 'The query could not be executed.',
        },
        data: null,
      });
    } else {
      res.json({
        status: 'success',
        meta: {
          paginate: {
            total: result.total,
            previous: ((page > 1) ? page - 1 : null),
            next: (((limit * page) < result.total) ? page + 1 : null),
          },
        },
        data: result.users,
      });
    }
  });
});

// Get current user
router.get('/users/me', (req, res) => {
  UserModel.findById(req.jwt.id, (err, user) => {
    if (err) {
      res.json({
        status: 'error',
        meta: {
          message: 'User information could not be found.',
        },
        data: null,
      });
    } else if (user === null) {
      res.json({
        status: 'fail',
        meta: {
          message: 'User information could not be found.',
        },
        data: null,
      });
    } else {
      const userObj = user.toObject();
      delete userObj.password;

      res.json({
        status: 'success',
        meta: {
          message: 'The user was found.',
        },
        data: userObj,
      });
    }
  });
});

// Get user
router.get('/users/:user', (req, res) => {
  if ((req.params.user === req.jwt.id) || (req.jwt.role === 'admin')) {
    res.json({
      status: 'fail',
      meta: {
        message: 'You are not authorised.',
      },
      data: null,
    });
  }

  UserModel.findById(req.params.user, (err, user) => {
    if (err) {
      res.json({
        status: 'error',
        meta: {
          message: 'User information could not be found.',
        },
        data: null,
      });
    } else if (user === null) {
      res.json({
        status: 'fail',
        meta: {
          message: 'User information could not be found.',
        },
        data: null,
      });
    } else {
      const userObj = user.toObject();
      delete userObj.password;

      res.json({
        status: 'success',
        meta: {
          message: 'The user was found.',
        },
        data: userObj,
      });
    }
  });
});

// Update user
router.put('/users/:user', (req, res) => {
  if ((req.params.user !== req.jwt.id) || (req.jwt.role !== 'admin')) {
    res.json({
      status: 'fail',
      meta: {
        message: 'You are not authorised.',
      },
      data: null,
    });
  }

  UserModel.findById(req.params.user, (err, user) => {
    if (err) {
      res.json({
        status: 'error',
        meta: {
          message: 'The user could not be updated.',
        },
        data: null,
      });
    } else if (user === null) {
      res.json({
        status: 'fail',
        meta: {
          message: 'The user was not found and could not be updated.',
        },
        data: null,
      });
    } else {
      user.set(req.body).save((saveErr, updatedUser) => {
        if (saveErr) {
          res.json({
            status: 'error',
            meta: {
              message: 'The user could not be updated.',
            },
            data: null,
          });
        } else {
          const userObj = updatedUser.toObject();
          delete userObj.password;

          res.json({
            status: 'success',
            meta: {
              message: 'The user was updated.',
            },
            data: userObj,
          });
        }
      });
    }
  });
});

// Delete user
router.delete('/users/:user', (req, res) => {
  if ((req.params.user !== req.jwt.id) || (req.jwt.role !== 'admin')) {
    res.json({
      status: 'fail',
      meta: {
        message: 'You are not authorised.',
      },
      data: null,
    });
  }

  UserModel.findByIdAndRemove(req.params.user, err => {
    if (err) {
      res.json({
        status: 'error',
        meta: {
          message: 'The user could not be updated.',
        },
        data: null,
      });
    } else {
      res.json({
        status: 'success',
        meta: {
          message: 'The user was deleted',
        },
        data: null,
      });
    }
  });
});

module.exports = router;
