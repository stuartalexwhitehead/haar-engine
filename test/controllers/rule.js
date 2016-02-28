const should = require('should');
const request = require('supertest');
const async = require('async');
const mongoose = require('mongoose');

const clearDatabase = require('../utils/clear-database');
const seedUsers = require('../utils/seed-users');
const seedDeviceTypes = require('../utils/seed-device-types');
const seedDevices = require('../utils/seed-devices');
const haar = require('../../index');

let users = null;
let deviceTypes = null;
let devices = null;

describe('Rules controller', function () {
  before(function (done) {
    haar.init();

    async.series({
      clearDatabase: clearDatabase,
      seedUsers: seedUsers,
      seedDeviceTypes: seedDeviceTypes,
    }, function (err, results) {
      if (err) {
        throw new Error(err);
      }

      users = results.seedUsers;
      deviceTypes = results.seedDeviceTypes;

      seedDevices(users, deviceTypes, function (err, seedDevices) {
        devices = seedDevices;
        done();
      });
    });
  });

  after(function (done) {
    mongoose.disconnect();
    return done();
  });

  describe('POST /rules/evaluate', function () {
    it('should enforce incorrect rule syntax', function (done) {
      request(haar.app)
        .post('/rules/evaluate')
        .send({
          name: 'Test Rule',
          description: 'A test rule',
          input: devices.sensor.model._id,
          output: devices.actuator.model._id,
          rule: 'fail = 123',
        })
        .set('x-access-token', users.user.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('fail');
        })
        .end(done);
    });

    it('should correctly evaluate rule', function (done) {
      request(haar.app)
        .post('/rules/evaluate')
        .send({
          name: 'Test Rule',
          description: 'A test rule',
          input: devices.sensor.model._id,
          output: devices.actuator.model._id,
          rule: 'output.test = 123',
        })
        .set('x-access-token', users.user.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('success');
          should(res.body.data.output.test).be.exactly(123);
        })
        .end(done);
    });
  });

  describe('POST /rules', function () {
    it('should enforce device classes', function (done) {
      request(haar.app)
        .post('/rules')
        .send({
          name: 'Test Rule',
          description: 'A test rule',
          input: devices.actuator.model._id,
          output: devices.sensor.model._id,
          rule: 'output.test = 123',
        })
        .set('x-access-token', users.user.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('fail');
        })
        .end(done);
    });

    it('should enforce device ownership', function (done) {
      request(haar.app)
        .post('/rules')
        .send({
          name: 'Test Rule',
          description: 'A test rule',
          input: devices.actuator.model._id,
          output: devices.sensor.model._id,
          rule: 'output.test = 123',
        })
        .set('x-access-token', users.user2.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('fail');
        })
        .end(done);
    });

    it('should create new rule', function (done) {
      request(haar.app)
        .post('/rules')
        .send({
          name: 'Test Rule',
          description: 'A test rule',
          input: devices.sensor.model._id,
          output: devices.actuator.model._id,
          rule: 'output.test = 123',
        })
        .set('x-access-token', users.user.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('success');
          should(res.body.data).not.be.null();
        })
        .end(done);
    });
  });

  describe('GET /rules', function () {
    it('should require a device', function (done) {
      request(haar.app)
        .get('/rules')
        .set('x-access-token', users.user.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('fail');
        })
        .end(done);
    });

    it('should retrieve rules for given device', function (done) {
      request(haar.app)
        .get('/rules')
        .query({
          device: devices.actuator.model._id.toString(),
        })
        .set('x-access-token', users.user.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('success');
        })
        .end(done);
    });
  });
});