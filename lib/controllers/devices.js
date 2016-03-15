const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const async = require('async');

const DeviceModel = require('../models/device');
const authenticate = require('../middlewares/authenticate');
const resHelpers = require('./helpers/response-helpers');

router.use('/devices', authenticate);

// Create device
router.post('/devices', (req, res) => {
  const fields = Object.assign({}, req.body, {
    owner: req.jwt.id,
  });

  DeviceModel.create(fields, (err, device) => {
    if (err && err.name && err.name === 'ValidationError') {
      return res.json(resHelpers.validationFail(
        'The device could not be created. Check validation.',
        err.errors,
        req.body
      ));
    }

    if (err) {
      return res.json(resHelpers.error(err));
    }

    res.json(resHelpers.success(
      'The device was created.',
      device.toObject()
    ));
  });
});

// List devices
router.get('/devices', (req, res) => {
  const page = req.query.page || 1;
  const limit = 20;

  const baseQuery = DeviceModel.find();

  if (req.jwt.role !== 'admin') {
    baseQuery.where('owner').equals(req.jwt.id);
  }

  async.parallel({
    total: function total(cb) {
      baseQuery.count(cb);
    },
    devices: function devices(cb) {
      baseQuery
        .skip(limit * (page - 1))
        .limit(limit)
        .populate('owner', 'username name')
        .populate('deviceType')
        .lean()
        .exec('find', cb);
    },
  }, (err, result) => {
    if (err) {
      return res.json(resHelpers.fail('The query could not be executed.'));
    }

    return res.json(resHelpers.success(
      'Devices were found',
      result.devices,
      {
        paginate: {
          total: result.total,
          previous: ((page > 1) ? page - 1 : null),
          next: (((limit * page) < result.total) ? page + 1 : null),
        },
      }
    ));
  });
});

// Get device
router.get('/devices/:device', (req, res) => {
  DeviceModel
  .findOne({
    _id: req.params.device,
  })
  .populate('owner', 'username name')
  .populate('deviceType')
  .exec((err, device) => {
    if (err) {
      return res.json(resHelpers.error('Device information could not be found.'));
    }

    if (device === null) {
      return res.json(resHelpers.fail(`There is no device with the id ${req.params.device}.`));
    }

    if (req.jwt.role !== 'admin' && req.jwt.id !== device.owner._id.toString()) {
      return res.json(resHelpers.fail('You are not authorised.'));
    }

    res.json(resHelpers.success(
      'The device was found.',
      device.toObject()
    ));
  });
});

// Update device
router.put('/devices/:device', (req, res) => {
  DeviceModel.findById(req.params.device, (err, device) => {
    if (err) {
      return res.json(resHelpers.error('The device could not be updated.'));
    }

    if (device === null) {
      return res.json(resHelpers.fail('The device was not found and could not be updated.'));
    }

    if (req.jwt.role !== 'admin' && req.jwt.id !== device.owner.toString()) {
      return res.json(resHelpers.fail('You are not authorised.'));
    }

    device.set(req.body).save((saveErr, updatedDevice) => {
      if (saveErr && saveErr.name && saveErr.name === 'ValidationError') {
        return res.json(resHelpers.validationFail(
          'The device could not be updated. Check validation.',
          saveErr.errors,
          req.body
        ));
      }

      if (saveErr) {
        return res.json(resHelpers.error(saveErr));
      }

      res.json(resHelpers.success(
        'The device was updated.',
        updatedDevice.toObject()
      ));
    });
  });
});

// Delete device
router.delete('/devices/:device', (req, res) => {
  DeviceModel.findById(req.params.device, (err, device) => {
    if (req.jwt.role !== 'admin' && req.jwt.id !== device.owner.toString()) {
      return res.json(resHelpers.fail('You are not authorised.'));
    }

    device.remove(removeErr => {
      if (removeErr) {
        return res.json(resHelpers.error('The device could not be deleted.'));
      }

      res.json(resHelpers.success('The device was deleted.'));
    });
  });
});

module.exports = router;
