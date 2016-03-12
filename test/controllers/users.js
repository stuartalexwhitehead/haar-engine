const should = require('should');
const request = require('supertest');
const async = require('async');
const mongoose = require('mongoose');

const clearDatabase = require('../utils/clear-database');
const seedUsers = require('../utils/seed-users');
const config = require('../utils/haar-config');
const UserModel = require('../../lib/models/user');
const haar = require('../../index');

let users = null;

describe('Users controller', function() {
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

  describe('POST /users', function() {
    it('should enforce authorisation', function(done) {
      request(haar.app)
        .post('/users')
        .set('x-access-token', users.user.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('fail');
        })
        .end(done);
    });

    it('should validate incorrect fields', function(done) {
      request(haar.app)
        .post('/users')
        .type('form')
        .set('x-access-token', users.admin.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('fail');
          should(res.body.meta.validation).not.be.undefined();
        })
        .end(done);
    });

    it('should create a new user', function(done) {
      request(haar.app)
        .post('/users')
        .type('form')
        .set('x-access-token', users.admin.token)
        .send({
          name: {
            given: 'Users',
            family: 'Controller',
          },
          username: 'userscontroller',
          password: 'userscontroller',
          email: 'controller@example.com',
        })
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('success');
        })
        .end(done);
    });
  });

  describe('GET /users', function() {
    it('should enforce authorisation', function(done) {
      request(haar.app)
        .get('/users')
        .set('x-access-token', users.user.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('fail');
        })
        .end(done);
    });

    it('should list users', function(done) {
      request(haar.app)
        .get('/users')
        .set('x-access-token', users.admin.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('success');
        })
        .end(done);
    });
  });

  describe('GET /users/me', function() {
    it('should retrieve details for authenticated user', function(done) {
      request(haar.app)
        .get('/users/me')
        .set('x-access-token', users.user.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('success');
          should(res.body.data._id).be.equal(users.user.model._id.toString());
        })
        .end(done);
    });
  });

  describe('GET /users/:user', function() {
    it('should enforce authorisation', function(done) {
      request(haar.app)
        .get(`/users/${users.user2.model._id}`)
        .set('x-access-token', users.user.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('fail');
        })
        .end(done);
    });

    it('should retrieve fields for given user', function(done) {
      request(haar.app)
        .get(`/users/${users.user2.model._id}`)
        .set('x-access-token', users.admin.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('success');
        })
        .end(done);
    });
  });

  describe('PUT /users/:user', function() {
    it('should enforce authorisation', function(done) {
      request(haar.app)
        .put(`/users/${users.user2.model._id}`)
        .set('x-access-token', users.user.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('fail');
        })
        .end(done);
    });

    it('should trigger validation rules', function(done) {
      request(haar.app)
        .put(`/users/${users.user.model._id}`)
        .set('x-access-token', users.user.token)
        .send('email=')
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('fail');
          should(res.body.meta.validation).not.be.undefined();
        })
        .end(done);
    });

    it('should update fields for given user', function(done) {
      request(haar.app)
        .put(`/users/${users.user.model._id}`)
        .set('x-access-token', users.user.token)
        .send('name[family]=Another')
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('success');
          should(res.body.data.name.family).be.exactly('Another');
        })
        .end(done);
    });
  });

  describe('DELETE /users/:user', function() {
    it('should enforce authorisation', function(done) {
      request(haar.app)
        .delete(`/users/${users.user2.model._id}`)
        .set('x-access-token', users.user.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('fail');
        })
        .end(done);
    });

    it('should remove the specified user', function(done) {
      request(haar.app)
        .delete(`/users/${users.user2.model._id}`)
        .set('x-access-token', users.admin.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('success');
        })
        .end(done);
    });
  });
});
