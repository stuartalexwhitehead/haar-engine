const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const async = require('async');

const DeviceModel = require('../models/device');
const authenticate = require('../middlewares/authenticate');

router.use('/devices', authenticate);

// Create device
router.post('/devices', (req, res) => {
  const fields = req.body;
  fields.owner = req.jwt.id;

  DeviceModel.create(fields, (err, device) => {
    if (err) {
      res.json({
        status: 'fail',
        meta: {
          message: 'The device could not be created. Check validation.',
          validation: err.errors,
        },
        data: null,
      });
    } else {
      res.json({
        status: 'success',
        meta: {
          message: 'The device was created.',
        },
        data: device.toObject(),
      });
    }
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
      res.status(500).json({
        status: 'fail',
        meta: {
          message: 'The query could not be executed.',
        },
        data: null,
      });
    } else {
      res.json({
        status: 'success',
        meta: {
          paginate: {
            total: result.total,
            previous: ((page > 1) ? page - 1 : null),
            next: (((limit * page) < result.total) ? page + 1 : null),
          },
        },
        data: result.devices,
      });
    }
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
      return res.json({
        status: 'error',
        meta: {
          message: 'Device information could not be found.',
        },
        data: null,
      });
    }

    if (device === null) {
      return res.json({
        status: 'fail',
        meta: {
          message: `There is no device with the id ${req.params.device}.`,
        },
        data: null,
      });
    }

    if (req.jwt.role === 'admin' || req.jwt.id === device.owner._id.toString()) {
      res.json({
        status: 'success',
        meta: {
          message: 'The device was found.',
        },
        data: device.toObject(),
      });
    } else {
      res.json({
        status: 'fail',
        meta: {
          message: 'You are not authorised.',
        },
        data: null,
      });
    }
  });
});

// Update device
router.put('/devices/:device', (req, res) => {
  DeviceModel.findById(req.params.device, (err, device) => {
    if (err) {
      return res.json({
        status: 'error',
        meta: {
          message: 'The device could not be updated.',
        },
        data: null,
      });
    }

    if (device === null) {
      return res.json({
        status: 'fail',
        meta: {
          message: 'The device was not found and could not be updated.',
        },
        data: null,
      });
    }

    if (req.jwt.role !== 'admin' && req.jwt.id !== device.owner.toString()) {
      return res.json({
        status: 'fail',
        meta: {
          message: 'You are not authorised.',
        },
        data: null,
      });
    }

    device.set(req.body).save((saveErr, updatedDevice) => {
      if (saveErr) {
        res.json({
          status: 'fail',
          meta: {
            message: 'The device could not be updated. Check validation.',
            validation: saveErr.errors,
          },
          data: null,
        });
      } else {
        res.json({
          status: 'success',
          meta: {
            message: 'The device was updated.',
          },
          data: updatedDevice.toObject(),
        });
      }
    });
  });
});

// Delete device
router.delete('/devices/:device', (req, res) => {
  DeviceModel.findById(req.params.device, (err, device) => {
    if (req.jwt.role !== 'admin' && req.jwt.id !== device.owner.toString()) {
      return res.json({
        status: 'fail',
        meta: {
          message: 'You are not authorised.',
        },
        data: null,
      });
    }

    device.remove(removeErr => {
      if (removeErr) {
        res.json({
          status: 'error',
          meta: {
            message: 'The device could not be deleted.',
          },
          data: null,
        });
      } else {
        res.json({
          status: 'success',
          meta: {
            message: 'The device was deleted.',
          },
          data: null,
        });
      }
    });
  });
});

module.exports = router;
