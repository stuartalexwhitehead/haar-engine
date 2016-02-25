const should = require('should');
const mongoose = require('mongoose');
const async= require('async');

const clearDatabase = require('../utils/clear-database');
const haar = require('../../index');
const DeviceTypeModel = require('../../lib/models/device-type');

describe('Device type model', function() {

  before(function (done) {
    haar.init();

    clearDatabase(function () {
      done();
    });
  });

  after(function (done) {
    mongoose.disconnect();
    return done();
  });

  describe('#create', function() {
    it('should create a new device type', function(done) {
      DeviceTypeModel.create({
        name: 'Test Sensor',
        description: 'A test sensor',
        developer: 'Haar Engine',
        deviceClass: 'input',
        dataDescriptor: [
          {
            label: 'Time',
            unit: {
              longform: 'Seconds',
              shortform: 's',
            },
            max: 60,
            min: 0,
          },
        ]
      }, function (err, deviceType) {
        should(err).be.null();
        should(deviceType.name).be.equal('Test Sensor');
        should(deviceType.description).be.equal('A test sensor');
        should(deviceType.developer).be.equal('Haar Engine');
        should(deviceType.deviceClass).be.equal('input');
        should(deviceType.dataDescriptor[0].label).be.equal('Time');
        done();
      });
    });
  });  
});
