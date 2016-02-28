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

describe('Data controller', function () {
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

  describe('POST /data', function () {
    it('should enforce validation', function (done) {
      request(haar.app)
        .post('/data')
        .set('x-access-token', users.user.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('fail');
        })
        .end(done);
    });

    it('should store a new data point', function (done) {
      request(haar.app)
        .post('/data')
        .send({
          device: devices.sensor.model._id.toString(),
          data: [{
            name: 'red',
            value: 255,
          }, {
            name: 'green',
            value: 255,
          }, {
            name: 'blue',
            value: 255,
          }]
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

  describe('GET /data', function () {
    it('should require a device', function (done) {
      request(haar.app)
        .get('/data')
        .set('x-access-token', users.user.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('fail');
        })
        .end(done);
    });

    it('should allow public access to public sensors', function (done) {
      request(haar.app)
        .get('/data')
        .query({
          device: devices.sensor.model._id.toString(),
        })
        .set('x-access-token', users.user2.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('success');
          should(res.body.data).not.be.null();
        })
        .end(done);
    });

    it('should enforce private access to private sensors', function (done) {
      request(haar.app)
        .get('/data')
        .query({
          device: devices.sensor2.model._id.toString(),
        })
        .set('x-access-token', users.user2.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('fail');
        })
        .end(done);
    });
  });
});