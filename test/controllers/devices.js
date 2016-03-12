const should = require('should');
const request = require('supertest');
const async = require('async');
const mongoose = require('mongoose');

const clearDatabase = require('../utils/clear-database');
const seedUsers = require('../utils/seed-users');
const seedDeviceTypes = require('../utils/seed-device-types');
const seedDevices = require('../utils/seed-devices');
const config = require('../utils/haar-config');
const haar = require('../../index');

let users = null;
let deviceTypes = null;
let devices = null;

describe('Devices controller', function () {
  before(function (done) {
    haar.init(config);

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

  describe('POST /devices', function () {
    it('should enforce validation', function (done) {
      request(haar.app)
        .post('/devices')
        .set('x-access-token', users.user.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('fail');
        })
        .end(done);
    });

    it('should create new device', function (done) {
      request(haar.app)
        .post('/devices')
        .send({
          name: 'Unit Test',
          description: 'A device for unit testing',
          deviceType: deviceTypes.actuator.model._id,
          visibility: 'private',
          address: '123456781234567b',
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

  describe('GET /devices', function () {
    it('should retrieve a list of devices', function (done) {
      request(haar.app)
        .get('/devices')
        .set('x-access-token', users.admin.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('success');
          should(res.body.data).not.be.null();
        })
        .end(done);
    });
  });

  describe('GET /devices/:device', function () {
    it('should enforce authorisation', function (done) {
      request(haar.app)
        .get(`/devices/${devices.sensor.model._id}`)
        .set('x-access-token', users.user2.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('fail');
        })
        .end(done);
    });

    it('should retrieve information for specified device', function (done) {
      request(haar.app)
        .get(`/devices/${devices.sensor.model._id}`)
        .set('x-access-token', users.user.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('success');
          should(res.body.data).not.be.null();
        })
        .end(done);
    });
  });

  describe('PUT /devices/:device', function () {
    it('should enforce authorisation', function (done) {
      request(haar.app)
        .put(`/devices/${devices.sensor.model._id}`)
        .set('x-access-token', users.user2.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('fail');
        })
        .end(done);
    });

    it('should enforce validation', function (done) {
      request(haar.app)
        .put(`/devices/${devices.sensor.model._id}`)
        .send('name=')
        .set('x-access-token', users.user.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('fail');
        })
        .end(done);
    });

    it('should update the specified device', function (done) {
      request(haar.app)
        .put(`/devices/${devices.sensor.model._id}`)
        .send('name=Update Test Case')
        .set('x-access-token', users.user.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('success');
          should(res.body.data).not.be.null();
        })
        .end(done);
    });
  });

  describe('DELETE /devices/:device', function () {
    it('should enforce authorisation', function (done) {
      request(haar.app)
        .delete(`/devices/${devices.sensor.model._id}`)
        .set('x-access-token', users.user2.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('fail');
        })
        .end(done);
    });

    it('should delete the specified device', function (done) {
      request(haar.app)
        .delete(`/devices/${devices.sensor.model._id}`)
        .set('x-access-token', users.user.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('success');
        })
        .end(done);
    });
  });
});