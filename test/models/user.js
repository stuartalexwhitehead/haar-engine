const should = require('should');
const mongoose = require('mongoose');
const async= require('async');

const clearDatabase = require('../utils/clear-database');
const config = require('../utils/haar-config');
const haar = require('../../index');
const UserModel = require('../../lib/models/user');

describe('User model', function() {

  before(function (done) {
    haar.init(config);

    clearDatabase(function () {
      done();
    });
  });

  after(function (done) {
    mongoose.disconnect();
    return done();
  });

  describe('#create', function() {
    it('should create a new user', function(done) {
      UserModel.create({
        name: {
          given: 'Test',
          family: 'User',
        },
        username: 'usermodel',
        password: 'test123',
        email: 'test@example.com',
      }, function (err, createdUser) {
        should(err).be.null();
        should(createdUser.name.given).be.equal('Test');
        should(createdUser.name.family).be.equal('User');
        done();
      });
    });
  });

  describe('#pre', function() {
    it('should hash password', function(done) {
      UserModel.findOne({ username: 'usermodel'}, function(err, doc) {
        should(err).be.null();
        should(doc.password).not.be.equal('test123');
        done();
      });
    });
  });

  describe('#comparePassword', function() {
    it('should compare password', function(done) {
      UserModel.findOne({ username: 'usermodel'}, function(err, doc) {
        doc.comparePassword('test123', function(err, isMatch) {
          should(err).be.null();
          should(isMatch).be.exactly(true);
          done();
        });
      });
    });
  });
});
