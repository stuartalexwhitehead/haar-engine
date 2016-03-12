const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const async = require('async');

const DataModel = require('../models/data');
const DeviceModel = require('../models/device');
const authenticate = require('../middlewares/authenticate');

// Store data
router.post('/data', authenticate, (req, res) => {
  DeviceModel
  .findOne({
    _id: req.body.device,
  })
  .populate('deviceType')
  .exec((err, device) => {
    if (err || device === null) {
      return res.json({
        status: 'fail',
        meta: {
          message: 'The data could not be stored - the associated device could not be found.',
        },
        data: null,
      });
    }

    if (device.owner.toString() !== req.jwt.id) {
      return res.json({
        status: 'fail',
        meta: {
          message: 'You are not authorised.',
        },
        data: null,
      });
    }

    if (device.deviceType.deviceClass !== 'input') {
      return res.json({
        status: 'fail',
        meta: {
          message: 'The specified device cannot generate data.',
        },
        data: null,
      });
    }

    DataModel.create(req.body, (saveErr, data) => {
      if (saveErr) {
        res.json({
          status: 'fail',
          meta: {
            message: 'The data could not be stored. Check validation.',
            validation: saveErr.errors,
          },
          data: null,
        });
      } else {
        res.json({
          status: 'success',
          meta: {
            message: 'The data was saved.',
          },
          data: data.toObject(),
        });
      }
    });
  });
});

router.get('/data', (req, res) => {
  DeviceModel.findById(req.query.device, (err, device) => {
    if (err || device === null) {
      return res.json({
        status: 'fail',
        meta: {
          message: 'Data could not be retrieved - the specified device could not be found.',
        },
        data: null,
      });
    }

    const notPublic = device.visibility !== 'public';
    const notOwner = req.jwt && req.jwt.id !== device.owner.toString();
    const notAdmin = req.jwt && req.jwt.role !== 'admin';

    if (notPublic && notOwner && notAdmin) {
      return res.json({
        status: 'fail',
        meta: {
          message: 'You are not authorised.',
        },
        data: null,
      });
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
          data: result.data,
        });
      }
    });
  });
});

module.exports = router;
