const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const async = require('async');
const _ = require('lodash');

const DataModel = require('../models/data');
const DeviceModel = require('../models/device');
const authenticate = require('../middlewares/authenticate');
const resHelpers = require('./helpers/response-helpers');

function isValidDate(candidate) {
  if (Object.prototype.toString.call(candidate) === '[object Date]') {
    if (isNaN(candidate.getTime())) {
      return false;
    }

    return true;
  }

  return false;
}

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
  const { query } = req;

  DeviceModel.findById(query.device, (err, device) => {
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

    const page = query.page || 1;
    const limit = query.limit || 20;
    const filters = {
      'data.name': query['data.name'],
      'data.value': query['data.value'],
    };
    const sort = query.sort || 'createdAt';
    const order = query.order && query.order === 'asc' ? 1 : -1;

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

    if (query.dateFrom) {
      const fromDate = new Date(query.dateFrom);

      if (isValidDate(fromDate)) {
        _.merge(criteria, {
          createdAt: {
            $gte: fromDate,
          },
        });
      }
    }

    if (query.dateTo) {
      const toDate = new Date(query.dateTo);

      if (isValidDate(toDate)) {
        _.merge(criteria, {
          createdAt: {
            $lte: toDate,
          },
        });
      }
    }

    async.parallel({
      total: function total(cb) {
        DataModel.find(criteria).count(cb);
      },
      data: function getData(cb) {
        DataModel
          .find(criteria)
          .skip(limit * (page - 1))
          .limit(limit)
          .lean()
          .sort({
            [sort]: order,
          })
          .exec('find', cb);
      },
    }, (errs, result) => {
      if (errs) {
        return res.json(resHelpers.error('The query could not be executed.'));
      }

      const pages = Math.ceil(result.total / limit);

      if (pages > 0 && page > pages) {
        return res.json(resHelpers.error(`Page ${page} does not exist`));
      }

      res.json(resHelpers.success(
        'Data was found.',
        result.data,
        {
          paginate: {
            total: result.total,
            pages,
            currentPage: pages > 0 ? page : 0,
            previousPages: ((page > 1) ? page - 1 : null),
            nextPages: (((limit * page) < result.total) ? page + 1 : null),
          },
        }
      ));
    });
  });
});

module.exports = router;
