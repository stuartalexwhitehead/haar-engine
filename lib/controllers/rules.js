const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const vm = require('vm');
const async = require('async');

const DeviceModel = require('../models/device');
const RuleModel = require('../models/rule');
const authenticate = require('../middlewares/authenticate');

function randomDataValue(dataDescriptor) {
  const { min = 0, max = 100 } = dataDescriptor;
  const dataValue = Math.floor(Math.random() * (max - min + 1) + min);
  return dataValue;
}

function randomDataValues(dataDescriptors) {
  const dataValues = {};
  dataDescriptors.forEach(dataDescriptor => {
    dataValues[dataDescriptor.name] = randomDataValue(dataDescriptor);
  });
  return dataValues;
}

function evaluateRule(populatedRule, callback) {
  populatedRule.validate(err => {
    if (err) {
      return callback(err);
    }

    const inputDescriptors = populatedRule.input.deviceType.dataDescriptor;
    const outputDescriptors = populatedRule.output.deviceType.dataDescriptor;
    const sandbox = {
      previous: randomDataValues(inputDescriptors),
      input: randomDataValues(inputDescriptors),
      output: randomDataValues(outputDescriptors),
    };

    try {
      vm.runInNewContext(populatedRule.rule, sandbox);
    } catch (vmErr) {
      return callback(vmErr.toString());
    }
    return callback(null, sandbox);
  });
}

router.use('/rules', authenticate);

router.post('/rules', (req, res) => {
  const rule = new RuleModel(req.body);
  const populateOptions = [
    {
      path: 'input',
      model: 'Device',
      populate: {
        path: 'deviceType',
        model: 'Device Type',
      },
    },
    {
      path: 'output',
      model: 'Device',
      populate: {
        path: 'deviceType',
        model: 'Device Type',
      },
    },
  ];

  RuleModel.populate(rule, populateOptions, (popErr, populatedRule) => {
    if (popErr) {
      return res.json({
        status: 'fail',
        meta: {
          message: 'The rule could not be populated',
          validation: popErr,
        },
        data: null,
      });
    }

    const inputIsInput = populatedRule.input.deviceType.deviceClass === 'input';
    const outputIsOutput = populatedRule.output.deviceType.deviceClass === 'output';
    const hasInputAuth = populatedRule.input.visibility === 'public'
      || req.jwt && populatedRule.input.owner.toString() === req.jwt.id;
    const hasOutputAuth = req.jwt && populatedRule.output.owner.toString() === req.jwt.id;

    if (!inputIsInput || !outputIsOutput) {
      return res.json({
        status: 'fail',
        meta: {
          message: 'The devices are not of the correct class.',
        },
        data: null,
      });
    }

    if (!hasInputAuth || !hasOutputAuth) {
      return res.json({
        status: 'fail',
        meta: {
          message: 'You are not authorised.',
        },
        data: null,
      });
    }

    evaluateRule(populatedRule, evalErr => {
      if (evalErr) {
        return res.json({
          status: 'fail',
          meta: {
            message: 'The rule could not be evaluated. Check validation.',
            validation: evalErr,
          },
          data: null,
        });
      }

      RuleModel.update({
        output: populatedRule.output.id,
        enabled: true,
      }, {
        enabled: false,
      }, updateErr => {
        populatedRule.save((saveErr, doc) => {
          if (updateErr || saveErr) {
            res.json({
              status: 'fail',
              meta: {
                message: 'The rule could not be saved.',
              },
              data: null,
            });
          } else {
            res.json({
              status: 'success',
              meta: {
                message: 'The rule was saved and is now active.',
              },
              data: doc.toObject(),
            });
          }
        });
      });
    });
  });
});

router.get('/rules', (req, res) => {
  if (!req.query.device) {
    return res.json({
      status: 'fail',
      meta: {
        message: 'You have not provided an output device ID.',
      },
      data: null,
    });
  }

  DeviceModel.findById(req.query.device, (err, device) => {
    if (err || device === null) {
      return res.json({
        status: 'fail',
        meta: {
          message: `There is no device with the id ${req.query.device}.`,
        },
        data: null,
      });
    }

    const notOwner = req.jwt && req.jwt.id !== device.owner.toString();
    const notAdmin = req.jwt && req.jwt.role !== 'admin';

    if (notOwner && notAdmin) {
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

    const baseQuery = RuleModel.find({
      output: device._id.toString(),
    });

    async.parallel({
      total: function total(cb) {
        baseQuery.count(cb);
      },
      rules: function rules(cb) {
        baseQuery
          .skip(limit * (page - 1))
          .limit(limit)
          .populate('input output')
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
          data: result.rules,
        });
      }
    });
  });
});

router.post('/rules/evaluate', (req, res) => {
  const rule = new RuleModel(req.body);
  const populateOptions = [
    {
      path: 'input',
      model: 'Device',
      populate: {
        path: 'deviceType',
        model: 'Device Type',
      },
    },
    {
      path: 'output',
      model: 'Device',
      populate: {
        path: 'deviceType',
        model: 'Device Type',
      },
    },
  ];

  RuleModel.populate(rule, populateOptions, (err, populatedRule) => {
    if (err) {
      res.json({
        status: 'fail',
        meta: {
          message: 'The rule could not be populated.',
          validation: err,
        },
        data: null,
      });
    }

    evaluateRule(populatedRule, (evalErr, sandbox) => {
      if (evalErr) {
        res.json({
          status: 'fail',
          meta: {
            message: 'The rule could not be evaluated. Check validation.',
            validation: evalErr,
          },
          data: null,
        });
      } else {
        res.json({
          status: 'success',
          meta: {
            message: 'The rule was successfully evaluated.',
          },
          data: sandbox,
        });
      }
    });
  });
});

module.exports = router;
