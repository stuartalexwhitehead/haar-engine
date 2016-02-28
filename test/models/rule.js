const should = require('should');
const mongoose = require('mongoose');
const async= require('async');

const clearDatabase = require('../utils/clear-database');
const haar = require('../../index');
const RuleModel = require('../../lib/models/rule');
const seedUsers = require('../utils/seed-users');
const seedDeviceTypes = require('../utils/seed-device-types');
const seedDevices = require('../utils/seed-devices');

let users = null;
let deviceTypes = null;
let devices = null;

describe('Rule model', function() {

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

  describe('#create', function() {
    it('should create a new rule', function(done) {
      RuleModel.create({
        name: 'Test Rule',
        description: 'A test rule',
        input: devices.sensor.model._id,
        output: devices.actuator.model._id,
        rule: 'output.test = 123',
      }, function (err, data) {
        should(err).be.null();
        done();
      });
    });
  });  
});
