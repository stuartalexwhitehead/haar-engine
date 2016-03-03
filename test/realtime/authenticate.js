const should = require('should');
const async = require('async');
const mongoose = require('mongoose');
const request = require('supertest');

const clearDatabase = require('../utils/clear-database');
const seedUsers = require('../utils/seed-users');
const seedDeviceTypes = require('../utils/seed-device-types');
const seedDevices = require('../utils/seed-devices');
const haar = require('../../index');

let users = null;
let deviceTypes = null;
let devices = null;

describe('Realtime authentication middleware', function () {
  before(function (done) {
    haar.init();

    async.series({
      clearDatabase: clearDatabase,
      seedUsers: seedUsers,
      seedDeviceTypes: seedDeviceTypes,
      startServer: function(cb) {
        haar.server.listen(3000, cb);
      }
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
    haar.server.close();
    done();
  });

  describe('#onconnection', function () {
    it('should enforce authentication', function (done) {
      const client = new haar.io.Socket('http://localhost:3000');

      client.on('data', data => {
        should(data.status).be.equal('success');
        should(data.meta.message).be.equal('You are connected, but only as an anonymous user.');
        done();
      });

      client.on('error', err => {
        should(err).not.be.null();
        done();
      });
    });

    it('should handle invalid tokens as anonymous users', function (done) {
      const client = new haar.io.Socket('http://localhost:3000?token=invalid');

      client.on('data', data => {
        should(data.status).be.equal('fail');
        should(data.meta.message).be.equal('The token could not be verified. You are not authenticated.');
        done();
      });

      client.on('error', err => {
        should(err).not.be.null();
        done();
      });
    });

    it('should authenticate valid tokens', function (done) {
      const client = new haar.io.Socket(`http://localhost:3000?token=${users.user.token}`);

      client.on('data', data => {
        should(data.status).be.equal('success');
        should(data.meta.message).be.equal('You are connected as an authenticated user.');
        done();
      });

      client.on('error', err => {
        should(err).not.be.null();
        done();
      });
    });
  });

  describe('handler manager', function() {
    it('should handle incorrect criteria', function (done) {
      const client = new haar.io.Socket(`http://localhost:3000?token=${users.user.token}`);
      const payload = {
        room: 'input:invalid',
        action: 'invalid',
      };

      client.on('data', data => {
        client.writeAndWait(payload, response => {
          should(response.status).be.equal('fail');
          should(response.meta.message).be.equal('No room and action criteria match those specified.');
          done();
        });
      });

      client.on('error', err => {
        should(err).not.be.null();
        done();
      });
    });
  });
});