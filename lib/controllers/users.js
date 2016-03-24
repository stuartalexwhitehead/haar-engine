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
  const { query } = req;
  const page = query.page || 1;
  const limit = 20;
  const filters = {
    'name.given': query['name.given'],
    'name.family': query['name.family'],
    username: query.username,
    role: query.role,
  };
  const sort = query.sort || 'username';
  const order = query.order && query.order === 'desc' ? -1 : 1;

  const criteria = Object.keys(filters).reduce((prev, path) => {
    if (filters[path]) {
      return Object.assign({}, prev, {
        [path]: {
          $regex: new RegExp(filters[path], 'i'),
        },
      });
    }
    return prev;
  }, {});

  async.parallel({
    total: function total(cb) {
      UserModel.find(criteria).count(cb);
    },
    users: function users(cb) {
      UserModel
        .find(criteria)
        .select('name username role createdAt updatedAt')
        .skip(limit * (page - 1))
        .limit(limit)
        .sort({
          [sort]: order,
        })
        .lean()
        .exec(cb);
    },
  }, (err, result) => {
    if (err) {
      return res.json(resHelpers.error('The query could not be executed.'));
    }

    const pages = Math.ceil(result.total / limit);

    if (pages > 0 && page > pages) {
      return res.json(resHelpers.error(`Page ${page} does not exist`));
    }

    res.json(resHelpers.success(
      'Users were found',
      result.users,
      {
        paginate: {
          total: result.total,
          pages,
          currentPage: pages > 0 ? page : 0,
          previousPage: ((page > 1) ? page - 1 : null),
          nextPage: (((limit * page) < result.total) ? page + 1 : null),
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
