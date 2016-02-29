const DataModel = require('../models/data');
const DeviceModel = require('../models/device');

function data(socket, payload, res) {
  DeviceModel
  .findOne({
    address: payload.address,
  })
  .populate('deviceType')
  .exec((err, device) => {
    if (err || device === null) {
      return res({
        status: 'fail',
        meta: {
          message: 'The data could not be stored - the associated device could not be found.',
        },
        data: null,
      });
    }

    if (device.owner.toString() !== socket.jwt.id) {
      return res({
        status: 'fail',
        meta: {
          message: 'You are not authorised.',
        },
        data: null,
      });
    }

    if (device.deviceType.deviceClass !== 'input') {
      return res({
        status: 'fail',
        meta: {
          message: 'The specified device cannot generate data.',
        },
        data: null,
      });
    }

    DataModel.create({
      device,
      data: payload.data,
    }, (saveErr, doc) => {
      if (saveErr) {
        res({
          status: 'fail',
          meta: {
            message: 'The data could not be stored. Check validation.',
            validation: saveErr.errors,
          },
          data: null,
        });
      } else {
        res({
          status: 'success',
          meta: {
            message: 'The data was saved.',
          },
          data: doc.toObject(),
        });
      }
    });
  });
}

const handlers = {
  data,
};

function getHandler(handler, socket) {
  return handlers[handler] ? handlers[handler].bind(this, socket) : null;
}

module.exports = getHandler;
