const async = require('async');
const vm = require('vm');

const DataModel = require('../models/data');
const DeviceModel = require('../models/device');
const RuleModel = require('../models/rule');

function evaluateRule(previous, input, rule) {
  const sandbox = {
    previous: previous ? previous.data : null,
    input: input ? input.data : null,
    output: null,
  };

  try {
    vm.runInNewContext(rule.rule, sandbox);
    return sandbox.output;
  } catch (err) {
    return null;
  }
}

function triggerRules(socket, data) {
  async.parallel({
    previous: function getPreviousDatapoint(cb) {
      DataModel.findOne({
        device: data.device._id.toString(),
      })
        .sort('-createdAt')
        .skip(1)
        .exec(cb);
    },
    rules: function getActiveRules(cb) {
      RuleModel.find({
        input: data.device._id.toString(),
        enabled: true,
      }, cb);
    },
  }, (err, results) => {
    if (results.rules) {
      results.rules.forEach(rule => {
        const output = evaluateRule(rule);
        if (output) {
          socket.room(`output:stream:${data.device._id.toString()}`).write({
            address: data.device.address,
            data: output,
          });
        }
      });
    }
  });
}

function publish(socket, data, done) {
  const { payload } = data;

  if (!socket.jwt) {
    return done({
      status: 'fail',
      meta: {
        room: data.room,
        action: data.action,
        message: 'You are not authorised.',
      },
      data: null,
    });
  }

  DeviceModel
  .findOne({
    address: payload.address,
  })
  .populate('deviceType')
  .exec((err, device) => {
    if (err || device === null) {
      return done({
        status: 'fail',
        meta: {
          room: data.room,
          action: data.action,
          message: 'The data could not be stored - the associated device could not be found.',
        },
        data: null,
      });
    }

    if (device.owner.toString() !== socket.jwt.id) {
      return done({
        status: 'fail',
        meta: {
          room: data.room,
          action: data.action,
          message: 'You are not authorised.',
        },
        data: null,
      });
    }

    if (device.deviceType.deviceClass !== 'input') {
      return done({
        status: 'fail',
        meta: {
          room: data.room,
          action: data.action,
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
        return done({
          status: 'fail',
          meta: {
            room: data.room,
            action: data.action,
            message: 'The data could not be stored. Check validation.',
            validation: saveErr.errors,
          },
          data: null,
        });
      }

      const docObj = doc.toObject();

      socket
        .room(`input:stream:${docObj._id.toString()}`)
        .write({
          data: docObj,
        });

      triggerRules(socket, doc);

      done({
        status: 'success',
        meta: {
          room: data.room,
          action: data.action,
          message: 'The data was saved.',
        },
        data: docObj,
      });
    });
  });
}

function subscribe(socket, data, done) {
  const { room } = data;
  const pattern = /^(input):(stream):([a-fA-F0-9]{24})$/;
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

    if (device.deviceType.deviceClass !== 'input') {
      return done({
        status: 'fail',
        meta: {
          message: 'The specified device cannot generate data.',
        },
        data: null,
      });
    }

    const isPrivate = device.visibility === 'private';
    const isAnonymous = !socket.jwt;
    const notOwner = socket.jwt && socket.jwt.id !== device.owner.toString();

    if (isPrivate && (isAnonymous || notOwner)) {
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
  const pattern = /^(input):(stream):([a-fA-F0-9]{24})$/;
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
  publish,
};

module.exports = handlers;
