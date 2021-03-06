const should = require('should');
const async = require('async');
const mongoose = require('mongoose');
const request = require('supertest');

const clearDatabase = require('../utils/clear-database');
const seedUsers = require('../utils/seed-users');
const seedDeviceTypes = require('../utils/seed-device-types');
const seedDevices = require('../utils/seed-devices');
const config = require('../utils/haar-config');
const haar = require('../../index');

let users = null;
let deviceTypes = null;
let devices = null;

describe('Realtime input handlers', function () {
  before(function (done) {
    haar.init(config);

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

  describe('listen to device', function () {
    it('should validate device ID', function (done) {
      const client = new haar.io.Socket(`http://localhost:3000?token=${users.user.token}`);

      const payload = {
        room: 'output:stream:123456123456123456123456',
        action: 'subscribe',
      };

      client.on('open', () => {
        client.writeAndWait(payload, response => {
          should(response.status).be.equal('fail');
          should(response.meta.message).be.equal('The stream could not be joined - the device was not found.');
          done();
        });
      });

      client.on('error', err => {
        should(err).not.be.null();
        done();
      });
    });

    it('should enforce device class', function (done) {
      const client = new haar.io.Socket(`http://localhost:3000?token=${users.user.token}`);

      const payload = {
        room: `output:stream:${devices.sensor.model._id.toString()}`,
        action: 'subscribe',
      };

      client.on('open', () => {
        client.writeAndWait(payload, response => {
          should(response.status).be.equal('fail');
          should(response.meta.message).be.equal('The specified device cannot receive data.');
          done();
        });
      });

      client.on('error', err => {
        should(err).not.be.null();
        done();
      });
    });

    it('should enforce device privacy', function (done) {
      const client = new haar.io.Socket(`http://localhost:3000`);

      const payload = {
        room: `output:stream:${devices.actuator.model._id.toString()}`,
        action: 'subscribe',
      };

      client.on('open', () => {
        client.writeAndWait(payload, response => {
          should(response.status).be.equal('fail');
          should(response.meta.message).be.equal('You are not authorised.');
          done();
        });
      });

      client.on('error', err => {
        should(err).not.be.null();
        done();
      });
    });

    it('should join room', function (done) {
      const client = new haar.io.Socket(`http://localhost:3000?token=${users.user.token}`);

      const payload = {
        room: `output:stream:${devices.actuator.model._id.toString()}`,
        action: 'subscribe',
      };

      client.on('open', () => {
        client.writeAndWait(payload, response => {
          should(response.status).be.equal('success');
          done();
        });
      });

      client.on('error', err => {
        should(err).not.be.null();
        done();
      });
    });
  });

  describe('stop listening to device', function () {
    it('should ensure room occupation', function (done) {
      const client = new haar.io.Socket(`http://localhost:3000?token=${users.user.token}`);

      const payload = {
        room: `input:stream:${devices.actuator.model._id.toString()}`,
        action: 'unsubscribe',
      };

      client.on('open', () => {
        client.writeAndWait(payload, response => {
          should(response.status).be.equal('fail');
          should(response.meta.message).be.equal('You are not in the specified room.');
          done();
        });
      });

      client.on('error', err => {
        should(err).not.be.null();
        done();
      });
    });

    it('should leave room', function (done) {
      const client = new haar.io.Socket(`http://localhost:3000?token=${users.user.token}`);

      const joinPayload = {
        room: `output:stream:${devices.actuator.model._id.toString()}`,
        action: 'subscribe',
      };

      const leavePayload = {
        room: `output:stream:${devices.actuator.model._id.toString()}`,
        action: 'unsubscribe',
      };

      client.on('open', () => {
        client.writeAndWait(joinPayload, joinResponse => {
          client.writeAndWait(leavePayload, leaveResponse => {
            should(leaveResponse.status).be.equal('success');
            should(leaveResponse.meta.message).be.equal('You have left the room.');
            done();
          });
        });
      });

      client.on('error', err => {
        should(err).not.be.null();
        done();
      });
    });
  });
});