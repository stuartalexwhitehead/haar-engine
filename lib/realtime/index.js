const primusRooms = require('primus-rooms');
const primusResponder = require('primus-responder-haar');

const input = require('./input-handlers');
const output = require('./output-handlers');
const decodeJwt = require('./middlewares/decode-jwt');

function invokeHandler(socket, data = {}, done) {
  const { action, room } = data;
  const handlers = [
    {
      room: /^(input):(add)$/,
      action: 'publish',
      handler: input.publish,
    },
    {
      room: /^(input):(stream):([a-fA-F0-9]{24})$/,
      action: 'subscribe',
      handler: input.subscribe,
    },
    {
      room: /^(input):(stream):([a-fA-F0-9]{24})$/,
      action: 'unsubscribe',
      handler: input.unsubscribe,
    },
    {
      room: /^(output):(stream):([a-fA-F0-9]{24})$/,
      action: 'subscribe',
      handler: output.subscribe,
    },
    {
      room: /^(output):(stream):([a-fA-F0-9]{24})$/,
      action: 'unsubscribe',
      handler: output.unsubscribe,
    },
  ];

  const cb = done || function dummyCallback() { return; };

  for (const handler of handlers) {
    const isRoom = handler.room.test(room);
    const isAction = handler.action === action;
    const isFunction = typeof handler.handler === 'function';

    if (isRoom && isAction && isFunction) {
      return handler.handler(socket, data, cb);
    }
  }

  done({
    status: 'fail',
    meta: {
      message: 'No room and action criteria match those specified.',
    },
    data: null,
  });
}

function init(io) {
  io.use('rooms', primusRooms);
  io.use('responder', primusResponder);
  io.on('connection', decodeJwt);
  io.on('connection', socket => {
    socket.on('request', (data, done) => {
      invokeHandler(socket, data, done);
    });

    socket.on('data', (data) => {
      invokeHandler(socket, data);
    });
  });
}

module.exports = {
  init,
};
