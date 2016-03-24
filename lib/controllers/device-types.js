const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const async = require('async');

const DeviceTypeModel = require('../models/device-type');
const authenticate = require('../middlewares/authenticate');
const authorise = require('../middlewares/authorise');
const resHelpers = require('./helpers/response-helpers');

router.use('/device-types', authenticate);

// Create device type
router.post('/device-types', authorise('admin'), (req, res) => {
  DeviceTypeModel.create(req.body, (err, deviceType) => {
    if (err && err.name && err.name === 'ValidationError') {
      return res.json(resHelpers.validationFail(
        'The device type could not be created. Check validation.',
        err.errors,
        req.body
      ));
    }

    if (err) {
      return res.json(resHelpers.error(err));
    }

    res.json(resHelpers.success(
      'The device type was created.',
      deviceType.toObject()
    ));
  });
});

// List device types
router.get('/device-types', (req, res) => {
  const { query } = req;
  const page = query.page || 1;
  const limit = 20;
  const filters = {
    name: query.name,
    developer: query.developer,
    deviceClass: query.deviceClass,
  };
  const sort = query.sort || 'name';
  const order = query.order && query.order === 'desc' ? -1 : 1;

  const criteria = Object.keys(filters).reduce((prev, path) => {
    if (filters[path]) {
      return Object.assign({}, prev, {
        [path]: {
          $regex: new RegExp(filters[path], 'i'),
        },
      });
    }
    return prev;
  }, {});

  async.parallel({
    total: function total(cb) {
      DeviceTypeModel.find(criteria).count(cb);
    },
    deviceTypes: function getDeviceTypes(cb) {
      DeviceTypeModel
        .find(criteria)
        .skip(limit * (page - 1))
        .limit(limit)
        .sort({
          [sort]: order,
        })
        .lean()
        .exec(cb);
    },
  }, (err, result) => {
    if (err) {
      return res.json(resHelpers.error('The query could not be executed.'));
    }

    const pages = Math.ceil(result.total / limit);

    if (pages > 0 && page > pages) {
      return res.json(resHelpers.error(`Page ${page} does not exist`));
    }

    res.json(resHelpers.success(
      'Device types were found.',
      result.deviceTypes,
      {
        paginate: {
          total: result.total,
          pages,
          currentPage: pages > 0 ? page : 0,
          previousPage: ((page > 1) ? page - 1 : null),
          nextPage: (((limit * page) < result.total) ? page + 1 : null),
        },
      }
    ));
  });
});

// Get device type
router.get('/device-types/:deviceType', (req, res) => {
  DeviceTypeModel.findById(req.params.deviceType, (err, deviceType) => {
    if (err) {
      return res.json(resHelpers.error('Device type information could not be found.'));
    }

    if (deviceType === null) {
      return res.json(resHelpers.fail(
        `No device type could be found with the ID ${req.params.deviceType}`
      ));
    }

    res.json(resHelpers.success(
      'The device type was found.',
      deviceType.toObject()
    ));
  });
});

// Update device type
router.put('/device-types/:deviceType', authorise('admin'), (req, res) => {
  DeviceTypeModel.findById(req.params.deviceType, (err, deviceType) => {
    if (err) {
      return res.json(resHelpers.error('The device type could not be updated.'));
    }

    if (deviceType === null) {
      return res.json(resHelpers.fail(
        `No device type could be found with the ID ${req.params.deviceType}`
      ));
    }

    deviceType.set(req.body).save((saveErr, updatedDeviceType) => {
      if (saveErr && saveErr.name && saveErr.name === 'ValidationError') {
        return res.json(resHelpers.validationFail(
          'The device type could not be updated. Check validation.',
          saveErr.errors,
          req.body
        ));
      }

      if (saveErr) {
        return res.json(resHelpers.error(saveErr));
      }

      res.json(resHelpers.success(
        'The device type was updated.',
        updatedDeviceType.toObject()
      ));
    });
  });
});

// Delete device type
router.delete('/device-types/:deviceType', authorise('admin'), (req, res) => {
  DeviceTypeModel.findByIdAndRemove(req.params.deviceType, err => {
    if (err) {
      return res.json(resHelpers.error('The device type could not be deleted.'));
    }

    res.json(resHelpers.success('The device type was deleted'));
  });
});

module.exports = router;
