require('dotenv').config({ silent: true });
const async = require('async');

const config = require('../../lib/app/config');
const DeviceModel = require('../../lib/models/device');

function seedDevices(users, deviceTypes, callback) {
  async.parallel({
    sensor: function seedSensor (cb) {
      DeviceModel.create({
        name: 'Test Sensor Device',
        description: 'A test sensor device',
        deviceType: deviceTypes.sensor.model._id,
        owner: users.user.model._id,
        address64: '1234567812345678',
      }, cb);
    },
    actuator: function seedActuator (cb) {
      DeviceModel.create({
        name: 'Test Actuator Device',
        description: 'A test actuator device',
        deviceType: deviceTypes.actuator.model._id,
        owner: users.user.model._id,
        address64: '123456781234567a',
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

module.exports = seedDevices;
