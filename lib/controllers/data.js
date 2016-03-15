const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const async = require('async');

const DataModel = require('../models/data');
const DeviceModel = require('../models/device');
const authenticate = require('../middlewares/authenticate');
const resHelpers = require('./helpers/response-helpers');

// Store data
router.post('/data', authenticate, (req, res) => {
  DeviceModel
  .findOne({
    _id: req.body.device,
  })
  .populate('deviceType')
  .exec((err, device) => {
    if (err || device === null) {
      return res.json(resHelpers.fail(
        'The data could not be stored - the associated device could not be found.'
      ));
    }

    if (device.owner.toString() !== req.jwt.id) {
      return res.json(resHelpers.fail('You are not authorised.'));
    }

    if (device.deviceType.deviceClass !== 'input') {
      return res.json(resHelpers.fail('The specified device cannot generate data.'));
    }

    DataModel.create(req.body, (saveErr, data) => {
      if (saveErr && saveErr.name && saveErr.name === 'ValidationError') {
        return res.json(resHelpers.validationFail(
          'The data could not be stored. Check validation.',
          saveErr.errors,
          req.body
        ));
      }

      if (saveErr) {
        return res.json(resHelpers.error(saveErr));
      }

      res.json(resHelpers.success(
        'The data was saved.',
        data.toObject()
      ));
    });
  });
});

router.get('/data', (req, res) => {
  DeviceModel.findById(req.query.device, (err, device) => {
    if (err || device === null) {
      return res.json(resHelpers.fail(
        'Data could not be retrieved - the specified device could not be found.'
      ));
    }

    const notPublic = device.visibility !== 'public';
    const notOwner = req.jwt && req.jwt.id !== device.owner.toString();
    const notAdmin = req.jwt && req.jwt.role !== 'admin';

    if (notPublic && notOwner && notAdmin) {
      return res.json(resHelpers.fail('You are not authorised.'));
    }

    const page = req.query.page || 1;
    const limit = 20;

    const baseQuery = DataModel.find();

    async.parallel({
      total: function total(cb) {
        baseQuery.count(cb);
      },
      data: function getData(cb) {
        baseQuery
          .skip(limit * (page - 1))
          .limit(limit)
          .lean()
          .exec('find', cb);
      },
    }, (errs, result) => {
      if (errs) {
        return res.json(resHelpers.error('The query could not be executed.'));
      }

      res.json(resHelpers.success(
        'Data was found.',
        result.data,
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
});

module.exports = router;
