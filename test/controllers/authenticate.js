const should = require('should');
const request = require('supertest');
const async = require('async');
const mongoose = require('mongoose');

const clearDatabase = require('../utils/clear-database');
const seedUsers = require('../utils/seed-users');
const config = require('../utils/haar-config');
const haar = require('../../index');

let users = null;

describe('Authenticate controller', function () {
  before(function (done) {
    haar.init(config);

    async.series({
      clearDatabase: clearDatabase,
      seedUsers: seedUsers,
    }, function (err, results) {
      if (err) {
        throw new Error(err);
      }

      users = results.seedUsers;
      done();
    });
  });

  after(function (done) {
    mongoose.disconnect();
    return done();
  });

  describe('POST /authenticate', function () {
    it('should enforce authentication', function (done) {
      request(haar.app)
        .post('/authenticate')
        .set('x-access-token', users.user.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('fail');
        })
        .end(done);
    });

    it('should authenticate genuine credentials', function (done) {
      request(haar.app)
        .post('/authenticate')
        .send({
          username: 'tester',
          password: 'test123',
        })
        .set('x-access-token', users.user.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          console.log(res.body.data);
          should(res.body.status).be.exactly('success');
          should(res.body.data.token).not.be.null();
        })
        .end(done);
    });
  });
});