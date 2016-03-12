const should = require('should');
const mongoose = require('mongoose');
const async= require('async');

const clearDatabase = require('../utils/clear-database');
const haar = require('../../index');
const DataModel = require('../../lib/models/data');
const seedUsers = require('../utils/seed-users');
const seedDeviceTypes = require('../utils/seed-device-types');
const seedDevices = require('../utils/seed-devices');
const config = require('../utils/haar-config');

let users = null;
let deviceTypes = null;
let devices = null;

describe('Data model', function() {

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

  describe('#create', function() {
    it('should store a data point', function(done) {
      DataModel.create({
        device: devices.sensor.model._id,
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
      }, function (err, data) {
        should(err).be.null();
        should(data.data.length).be.equal(3);
        done();
      });
    });
  });  
});
