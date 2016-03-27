const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const async = require('async');
const _ = require('lodash');

const DeviceModel = require('../models/device');
const DataModel = require('../models/data');
const DeviceTypeModel = require('../models/device-type');
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
  const { query } = req;
  const page = query.page || 1;
  const limit = 20;
  const filters = {
    name: query.name,
    visibility: query.visibility,
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

  if (req.jwt.role !== 'admin') {
    return res.json(resHelpers.fail('You are not authorised.'));
  }

  async.waterfall([
    function filterDeviceTypes(callback) {
      if (query['deviceType.deviceClass']) {
        DeviceTypeModel
          .find({
            deviceClass: query['deviceType.deviceClass'],
          })
          .select('_id')
          .lean()
          .exec((err, deviceTypes) => {
            const ids = deviceTypes.map(deviceType => deviceType._id);
            callback(null, ids);
          });
      } else {
        callback(null, null);
      }
    },
    function getDevices(deviceTypes, callback) {
      if (deviceTypes) {
        criteria.deviceType = {
          $in: deviceTypes,
        };
      }

      async.parallel({
        total: function total(cb) {
          DeviceModel.find(criteria).count(cb);
        },
        devices: function devices(cb) {
          DeviceModel
            .find(criteria)
            .skip(limit * (page - 1))
            .limit(limit)
            .populate('owner', 'username name')
            .populate('deviceType')
            .sort({
              [sort]: order,
            })
            .lean()
            .exec('find', cb);
        },
      }, (err, result) => {
        callback(err, result);
      });
    },
  ], (err, result) => {
    if (err) {
      return res.json(resHelpers.fail('The query could not be executed.'));
    }

    const pages = Math.ceil(result.total / limit);

    if (pages > 0 && page > pages) {
      return res.json(resHelpers.error(`Page ${page} does not exist`));
    }

    return res.json(resHelpers.success(
      'Devices were found',
      result.devices,
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

// Get own devices
router.get('/devices/mine', (req, res) => {
  const { query } = req;
  const page = query.page || 1;
  const limit = 20;
  const filters = {
    name: query.name,
    visibility: query.visibility,
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

  criteria.owner = {
    $eq: req.jwt.id,
  };

  async.parallel({
    total: function total(cb) {
      DeviceModel.find(criteria).count(cb);
    },
    devices: function devices(cb) {
      DeviceModel
        .find(criteria)
        .skip(limit * (page - 1))
        .limit(limit)
        .populate('deviceType')
        .sort({
          [sort]: order,
        })
        .lean()
        .exec('find', cb);
    },
  }, (err, result) => {
    if (err) {
      return res.json(resHelpers.fail('The query could not be executed.'));
    }

    const pages = Math.ceil(result.total / limit);

    if (pages > 0 && page > pages) {
      return res.json(resHelpers.error(`Page ${page} does not exist`));
    }

    if (!query.lastData) {
      return res.json(resHelpers.success(
        'Devices were found',
        result.devices,
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
    }

    async.map(result.devices, (device, cb) => {
      DataModel
        .find({
          device: device._id,
        })
        .limit(1)
        .sort('-createdAt')
        .lean()
        .exec('find', (dataErr, dataPoint) => {
          cb(dataErr, _.merge({}, device, {
            dataPoint,
          }));
        });
    }, (mapErr, mapResults) =>
      res.json(resHelpers.success(
        'Devices were found',
        mapResults,
        {
          paginate: {
            total: result.total,
            pages,
            currentPage: pages > 0 ? page : 0,
            previousPage: ((page > 1) ? page - 1 : null),
            nextPage: (((limit * page) < result.total) ? page + 1 : null),
          },
        }
      ))
    );
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
