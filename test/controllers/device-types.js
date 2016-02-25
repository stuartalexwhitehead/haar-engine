const should = require('should');
const request = require('supertest');
const async = require('async');
const mongoose = require('mongoose');

const clearDatabase = require('../utils/clear-database');
const seedUsers = require('../utils/seed-users');
const seedDeviceTypes = require('../utils/seed-device-types');
const haar = require('../../index');

let users = null;
let deviceTypes = null;

describe('Device types controller', function () {
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
      done();
    });
  });

  after(function (done) {
    mongoose.disconnect();
    return done();
  });

  describe('POST /device-types', function () {
    it('should enforce authorisation', function (done) {
      request(haar.app)
        .post('/device-types')
        .set('x-access-token', users.user.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('fail');
        })
        .end(done);
    });

    it('should enforce validation', function (done) {
      request(haar.app)
        .post('/device-types')
        .set('x-access-token', users.admin.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('fail');
          should(res.body.meta.validation).not.be.undefined();
        })
        .end(done);
    });

    it('should create device type', function (done) {
      request(haar.app)
        .post('/device-types')
        .send({
          name: 'Test Device',
          description: 'A test device',
          developer: 'Haar Engine',
          deviceClass: 'output',
          dataDescriptor: [
            {
              label: 'A Measurement',
              unit: {
                longform: 'Seconds',
                shortform: 's',
              },
              max: 2000,
              min: 500,
            },
          ]
        })
        .set('x-access-token', users.admin.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('success');
        })
        .end(done);
    });
  });

  describe('GET /device-types', function () {
    it('should list device types', function (done) {
      request(haar.app)
        .get('/device-types')
        .set('x-access-token', users.user.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('success');
          should(res.body.data).not.be.null();
        })
        .end(done);
    });
  });

  describe('GET /device-types/:deviceType', function () {
    it('should retrieve information for the specified device type', function (done) {
      request(haar.app)
        .get(`/device-types/${deviceTypes.sensor.model._id}`)
        .set('x-access-token', users.user.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('success');
          should(res.body.data).not.be.null();
        })
        .end(done);
    });
  });

  describe('PUT /device-types/:deviceType', function () {
    it('should enforce authorisation', function (done) {
      request(haar.app)
        .put(`/device-types/${deviceTypes.sensor.model._id}`)
        .set('x-access-token', users.user.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('fail');
        })
        .end(done);
    });

    it('should enforce validation', function (done) {
      request(haar.app)
        .put(`/device-types/${deviceTypes.sensor.model._id}`)
        .send('deviceClass=wrong')
        .set('x-access-token', users.admin.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('fail');
          should(res.body.meta.validation).not.be.undefined();
        })
        .end(done);
    });

    it('should update specified device type', function (done) {
      request(haar.app)
        .put(`/device-types/${deviceTypes.sensor.model._id}`)
        .send('deviceClass=output')
        .set('x-access-token', users.admin.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('success');
          should(res.body.data.deviceClass).be.exactly('output');
        })
        .end(done);
    });
  });

  describe('DELETE /device-types/:deviceType', function () {
    it('should enforce authorisation', function (done) {
      request(haar.app)
        .delete(`/device-types/${deviceTypes.sensor.model._id}`)
        .set('x-access-token', users.user.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('fail');
        })
        .end(done);
    });

    it('should delete specified device type', function (done) {
      request(haar.app)
        .delete(`/device-types/${deviceTypes.sensor.model._id}`)
        .set('x-access-token', users.admin.token)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          should(res.body.status).be.exactly('success');
        })
        .end(done);
    });
  });
});
