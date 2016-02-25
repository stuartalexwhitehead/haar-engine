const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const async = require('async');

const DeviceTypeModel = require('../models/device-type');
const authenticate = require('../middlewares/authenticate');
const authorise = require('../middlewares/authorise');

router.use('/device-types', authenticate);

// Create device type
router.post('/device-types', authorise('admin'));
router.post('/device-types', (req, res) => {
  DeviceTypeModel.create(req.body, (err, deviceType) => {
    if (err) {
      res.json({
        status: 'fail',
        meta: {
          message: 'The device type could not be created. Check validation.',
          validation: err.errors,
        },
        data: null,
      });
    } else {
      res.json({
        status: 'success',
        meta: {
          message: 'The device type was created.',
        },
        data: deviceType.toObject(),
      });
    }
  });
});

// List device types
router.get('/device-types', (req, res) => {
  const page = req.query.page || 1;
  const limit = 20;

  async.parallel({
    total: function total(cb) {
      DeviceTypeModel.count(cb);
    },
    deviceTypes: function getDeviceTypes(cb) {
      DeviceTypeModel
        .find()
        .skip(limit * (page - 1))
        .limit(limit)
        .lean()
        .exec(cb);
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
        data: result.deviceTypes,
      });
    }
  });
});

// Get device type
router.get('/device-type/:deviceType', (req, res) => {
  DeviceTypeModel.findById(req.params.deviceType, (err, deviceType) => {
    if (err) {
      res.json({
        status: 'error',
        meta: {
          message: 'Device type information could not be found.',
        },
        data: null,
      });
    } else if (deviceType === null) {
      res.json({
        status: 'fail',
        meta: {
          message: `No device type could be found with the ID ${req.params.deviceType}`,
        },
        data: null,
      });
    } else {
      res.json({
        status: 'success',
        meta: {
          message: 'The device type was found.',
        },
        data: deviceType.toObject(),
      });
    }
  });
});

// Update device type
router.put('/device-type/:deviceType', authorise('admin'));
router.put('/device-type/:deviceType', (req, res) => {
  DeviceTypeModel.findById(req.params.deviceType, (err, deviceType) => {
    if (err) {
      res.json({
        status: 'error',
        meta: {
          message: 'The device type could not be updated.',
        },
        data: null,
      });
    } else if (deviceType === null) {
      res.json({
        status: 'fail',
        meta: {
          message: `No device type could be found with the ID ${req.params.deviceType}`,
        },
        data: null,
      });
    } else {
      deviceType.set(req.body).save((saveErr, updatedDeviceType) => {
        if (saveErr) {
          res.json({
            status: 'fail',
            meta: {
              message: 'The device type could not be updated. Check validation.',
              validation: saveErr.errors,
            },
            data: null,
          });
        } else {
          res.json({
            status: 'success',
            meta: {
              message: 'The device type was updated.',
            },
            data: updatedDeviceType.toObject(),
          });
        }
      });
    }
  });
});

// Delete device type
router.delete('/device-type/:deviceType', authorise('admin'));
router.delete('/device-type/:deviceType', (req, res) => {
  DeviceTypeModel.findByIdAndRemove(req.params.deviceType, err => {
    if (err) {
      res.json({
        status: 'error',
        meta: {
          message: 'The device type could not be deleted.',
        },
        data: null,
      });
    } else {
      res.json({
        status: 'success',
        meta: {
          message: 'The device type was deleted',
        },
        data: null,
      });
    }
  });
});

module.exports = router;
