const should = require('should');
const async = require('async');
const mongoose = require('mongoose');
const ioClient = require('socket.io-client');

const clearDatabase = require('../utils/clear-database');
const seedUsers = require('../utils/seed-users');
const seedDeviceTypes = require('../utils/seed-device-types');
const seedDevices = require('../utils/seed-devices');
const haar = require('../../index');

let users = null;
let deviceTypes = null;
let devices = null;

describe('Realtime input controller', function () {
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

  describe('data', function () {
    it('should enforce authentication', function (done) {
      let input = ioClient.connect('http://localhost:3000/input');

      input.on('connect', socket => {
        should(socket).be.null();
        done();
      });

      input.on('error', err => {
        should(err).not.be.null();
        done();
      });
    });

    it('should connect with JWT token', function (done) {
      let input = ioClient.connect('http://localhost:3000/input', {
        query: `token=${users.user.token}`,
      });

      input.on('connect', socket => {
        should(socket).not.be.null();
        done();
      });

      input.on('error', err => {
        should(err).be.null();
        done();
      });
    });

    it('should store datapoint', function (done) {
      let input = ioClient.connect('http://localhost:3000/input', {
        query: `token=${users.user.token}`,
      });

      input.on('connect', () => {
        input.emit('data', {
          address: devices.sensor.model.address,
          data: [
            {
              name: 'time',
              value: 123,
            },
          ],
        }, function (ack) {
          console.log(ack);
          should(ack.status).be.equal('success');
        });
        done();
      });

      input.on('error', err => {
        should(err).be.null();
        done();
      });
    });
  });
});