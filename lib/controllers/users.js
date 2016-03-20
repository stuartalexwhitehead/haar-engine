const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const async = require('async');

const UserModel = require('../models/user');
const authenticate = require('../middlewares/authenticate');
const authorise = require('../middlewares/authorise');
const resHelpers = require('./helpers/response-helpers');

router.use('/users', authenticate);

// Create user
router.post('/users', authorise('admin'), (req, res) => {
  UserModel.create(req.body, (err, user) => {
    if (err) {
      return res.json(resHelpers.validationFail(
        'The user could not be created. Check validation.',
        err.errors,
        req.body
      ));
    }

    const userObj = user.toObject();
    delete userObj.password;

    res.json(resHelpers.success(
      'The user was created.',
      userObj
    ));
  });
});

// List users
router.get('/users', authorise('admin'), (req, res) => {
  const page = req.query.page || 1;
  const limit = 20;

  async.parallel({
    total: function total(cb) {
      UserModel.count(cb);
    },
    users: function users(cb) {
      UserModel
        .find()
        .select('name username role createdAt updatedAt')
        .skip(limit * (page - 1))
        .limit(limit)
        .lean()
        .exec(cb);
    },
  }, (err, result) => {
    if (err) {
      return res.json(resHelpers.error('The query could not be executed.'));
    }

    res.json(resHelpers.success(
      'Users were found',
      result.users,
      {
        paginate: {
          total: result.total,
          previous: ((page > 1) ? page - 1 : null),
          next: (((limit * page) < result.total) ? page + 1 : null),
        },
      }
    ));
  });
});

// Get current user
router.get('/users/me', (req, res) => {
  UserModel.findById(req.jwt.id, (err, user) => {
    if (err || user === null) {
      return res.json(resHelpers.error('User information could not be found.'));
    }

    const userObj = user.toObject();
    delete userObj.password;

    res.json(resHelpers.success(
      'The user was found',
      userObj
    ));
  });
});

// Get user
router.get('/users/:user', (req, res) => {
  if ((req.params.user !== req.jwt.id) && (req.jwt.role !== 'admin')) {
    return res.json(resHelpers.fail('You are not authorised.'));
  }

  UserModel.findById(req.params.user, (err, user) => {
    if (err) {
      return res.json(resHelpers.error('User information could not be found.'));
    }

    if (user === null) {
      return res.json(resHelpers.fail('User could not be found'));
    }

    const userObj = user.toObject();
    delete userObj.password;

    res.json(resHelpers.success(
      'The user was found.',
      userObj
    ));
  });
});

// Update user
router.put('/users/:user', (req, res) => {
  if ((req.params.user !== req.jwt.id) && (req.jwt.role !== 'admin')) {
    return res.json(resHelpers.fail('You are not authorised.'));
  }

  UserModel.findById(req.params.user, (err, user) => {
    if (err) {
      return res.json(resHelpers.error('The user could not be updated.'));
    }

    if (user === null) {
      return res.json(resHelpers.fail('The user was not found and could not be updated.'));
    }

    user.set(req.body).save((saveErr, updatedUser) => {
      if (saveErr) {
        return res.json(resHelpers.validationFail(
          'The user could not be updated. Check validation.',
          saveErr.errors,
          req.body
        ));
      }

      const userObj = updatedUser.toObject();
      delete userObj.password;

      res.json(resHelpers.success(
        'The user was updated.',
        userObj
      ));
    });
  });
});

// Delete user
router.delete('/users/:user', (req, res) => {
  if ((req.params.user !== req.jwt.id) && (req.jwt.role !== 'admin')) {
    return res.json(resHelpers.fail('You are not authorised.'));
  }

  UserModel.findByIdAndRemove(req.params.user, err => {
    if (err) {
      return res.json(resHelpers.error('The user could not be deleted.'));
    }

    res.json(resHelpers.success('The user was deleted'));
  });
});

module.exports = router;
