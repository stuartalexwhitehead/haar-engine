require('dotenv').config({ silent: true });
const async = require('async');
const jwt = require('jsonwebtoken');
const config = require('nconf');

const UserModel = require('../../lib/models/user');

function seedUsers (callback) {
  async.parallel({
    user: function seedUser (cb) {
      UserModel.create({
        name: {
          given: 'Test',
          family: 'User',
        },
        username: 'tester',
        password: 'test123',
        email: 'test@example.com',
      }, cb);
    },
    user2: function seedUser2 (cb) {
      UserModel.create({
        name: {
          given: 'Test',
          family: 'User',
        },
        username: 'tester2',
        password: 'test123',
        email: 'test@example.com',
      }, cb);
    },
    admin: function seedAdmin (cb) {
      UserModel.create({
        name: {
          given: 'Test',
          family: 'Admin',
        },
        username: 'admin',
        password: 'admin123',
        email: 'admin@example.com',
        role: 'admin',
      }, cb);
    }
  }, function (err, results) {
    if (err) {
      throw new Error(err);
    }

    const userToken = jwt.sign({
      id: results.user.id,
      username: results.user.username,
      name: results.user.name.full,
      role: results.user.role,
    }, 
    config.get('JWT:SECRET'),
    {
      expiresIn: '1 day',
    });

    const user2Token = jwt.sign({
      id: results.user2.id,
      username: results.user2.username,
      name: results.user2.name.full,
      role: results.user2.role,
    }, 
    config.get('JWT:SECRET'),
    {
      expiresIn: '1 day',
    });

    const adminToken = jwt.sign({
      id: results.admin.id,
      username: results.admin.username,
      name: results.admin.name.full,
      role: results.admin.role,
    }, 
    config.get('JWT:SECRET'),
    {
      expiresIn: '1 day',
    });

    const users = {
      user: {
        model: results.user.toObject(),
        token: userToken,
      },
      user2: {
        model: results.user2.toObject(),
        token: user2Token,
      },
      admin: {
        model: results.admin.toObject(),
        token: adminToken,
      }
    }

    callback(err, users);
  });
}

module.exports = seedUsers;
