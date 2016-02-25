require('dotenv').config({ silent: true });
const async = require('async');

const config = require('../../lib/app/config');
const DeviceTypeModel = require('../../lib/models/device-type');

function seedDeviceTypes (callback) {
  async.parallel({
    sensor: function seedSensor (cb) {
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
      }, cb);
    },
    actuator: function seedActuator (cb) {
      DeviceTypeModel.create({
        name: 'Test Actuator',
        description: 'A test actuator',
        developer: 'Haar Engine',
        deviceClass: 'output',
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
      }, cb);
    },
  }, function (err, results) {
    if (err) {
      throw new Error(err);
    }

    callback(err, {
      sensor: {
        model: results.sensor.toObject(),
      },
      actuator: {
        model: results.actuator.toObject(),
      }
    });
  });
}

module.exports = seedDeviceTypes;
