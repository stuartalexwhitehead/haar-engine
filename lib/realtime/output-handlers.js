const DeviceModel = require('../models/device');

function subscribe(socket, data, done) {
  const { room } = data;
  const pattern = /^(output):(stream):([a-fA-F0-9]{24})$/;
  const segments = pattern.exec(room);
  const deviceId = Array.isArray(segments) && segments[3] ? segments[3] : null;

  DeviceModel
  .findOne({
    _id: deviceId,
  })
  .populate('deviceType')
  .exec((err, device) => {
    if (err || device === null) {
      return done({
        status: 'fail',
        meta: {
          message: 'The stream could not be joined - the device was not found.',
        },
        data: null,
      });
    }

    if (device.deviceType.deviceClass !== 'output') {
      return done({
        status: 'fail',
        meta: {
          message: 'The specified device cannot receive data.',
        },
        data: null,
      });
    }

    const isAnonymous = !socket.jwt;
    const notOwner = socket.jwt && socket.jwt.id !== device.owner.toString();

    if (isAnonymous || notOwner) {
      return done({
        status: 'fail',
        meta: {
          message: 'You are not authorised.',
        },
        data: null,
      });
    }

    socket.join(room, () => {
      done({
        status: 'success',
        meta: {
          message: `You have been added to the room ${room}`,
        },
        data: null,
      });
    });
  });
}

function unsubscribe(socket, data, done) {
  const { room } = data;
  const pattern = /^(output):(stream):([a-fA-F0-9]{24})$/;
  const segments = pattern.exec(room);
  const deviceId = Array.isArray(segments) && segments[3] ? segments[3] : null;

  if (!deviceId) {
    return done({
      status: 'fail',
      meta: {
        message: 'You have not provided a valid room ID.',
      },
      data: null,
    });
  }

  const ids = socket.room(room).clients();

  if (!ids || ids.indexOf(socket.id) === -1) {
    return done({
      status: 'fail',
      meta: {
        message: 'You are not in the specified room.',
      },
      data: null,
    });
  }

  socket.leave(room, () => {
    done({
      status: 'success',
      meta: {
        message: 'You have left the room.',
      },
      data: null,
    });
  });
}

const handlers = {
  subscribe,
  unsubscribe,
};

module.exports = handlers;
