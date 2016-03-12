const should = require('should');
const mongoose = require('mongoose');
const async= require('async');

const clearDatabase = require('../utils/clear-database');
const haar = require('../../index');
const DeviceModel = require('../../lib/models/device-type');
const seedUsers = require('../utils/seed-users');
const seedDeviceTypes = require('../utils/seed-device-types');
const config = require('../utils/haar-config');

let users = null;
let deviceTypes = null;

describe('Device model', function() {

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

      done();
    });
  });

  after(function (done) {
    mongoose.disconnect();
    return done();
  });

  describe('#create', function() {
    it('should create a new device', function(done) {
      DeviceModel.create({
        name: 'Test Sensor Device',
        description: 'A test sensor device',
        deviceType: deviceTypes.sensor.model._id,
        owner: users.user.model._id,
        address: '1234567812345678',
      }, function (err, device) {
        should(err).be.null();
        done();
      });
    });
  });  
});
