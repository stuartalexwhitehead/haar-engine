const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const vm = require('vm');
const async = require('async');

const DeviceModel = require('../models/device');
const RuleModel = require('../models/rule');
const authenticate = require('../middlewares/authenticate');
const resHelpers = require('./helpers/response-helpers');

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

  rule.validate(valErr => {
    if (valErr && valErr.name && valErr.name === 'ValidationError') {
      return res.json(resHelpers.validationFail(
        'The rule could not be saved. Check validation.',
        valErr.errors,
        req.body
      ));
    }

    if (valErr) {
      return res.json(resHelpers.error(valErr));
    }

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
        return res.json(resHelpers.error('The rule could not be populated.'));
      }

      const inputIsInput = populatedRule.input.deviceType.deviceClass === 'input';
      const outputIsOutput = populatedRule.output.deviceType.deviceClass === 'output';
      const hasInputAuth = populatedRule.input.visibility === 'public'
        || req.jwt && populatedRule.input.owner.toString() === req.jwt.id;
      const hasOutputAuth = req.jwt && populatedRule.output.owner.toString() === req.jwt.id;

      if (!inputIsInput || !outputIsOutput) {
        return res.json(resHelpers.fail('The devices are not of the correct class.'));
      }

      if (!hasInputAuth || !hasOutputAuth) {
        return res.json(resHelpers.fail('You are not authorised.'));
      }

      evaluateRule(populatedRule, evalErr => {
        if (evalErr) {
          return res.json(resHelpers.fail(
            'The rule could not be evaluated. Check validation.',
            null,
            {
              validation: {
                rule: {
                  message: evalErr,
                },
              },
            }
          ));
        }

        RuleModel.update({
          output: populatedRule.output.id,
          enabled: true,
        }, {
          enabled: false,
        }, updateErr => {
          populatedRule.save((saveErr, doc) => {
            if (updateErr || saveErr) {
              return res.json(resHelpers.error('The rule could not be saved.'));
            }

            res.json(resHelpers.success(
              'The rule was saved and is now active.',
              doc.toObject()
            ));
          });
        });
      });
    });
  });
});

router.get('/rules', (req, res) => {
  if (!req.query.device) {
    return res.json(resHelpers.fail('You have not provided an output device ID.'));
  }

  DeviceModel.findById(req.query.device, (err, device) => {
    if (err) {
      return res.json(resHelpers.error('Could not retrieve rule.'));
    }

    if (device === null) {
      return res.json(resHelpers.fail(`There is no device with the id ${req.query.device}.`));
    }

    const notOwner = req.jwt && req.jwt.id !== device.owner.toString();
    const notAdmin = req.jwt && req.jwt.role !== 'admin';

    if (notOwner && notAdmin) {
      return res.json(resHelpers.fail('You are not authorised.'));
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
        return res.json(resHelpers.error('The query could not be executed.'));
      }

      res.json(resHelpers.success(
        'Rules were found',
        result.rules,
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

router.post('/rules/evaluate', (req, res) => {
  const rule = new RuleModel(req.body);

  rule.validate(valErr => {
    if (valErr && valErr.name && valErr.name === 'ValidationError') {
      return res.json(resHelpers.validationFail(
        'The rule could not be evaluated. Check validation.',
        valErr.errors,
        req.body
      ));
    }

    if (valErr) {
      return res.json(resHelpers.error(valErr));
    }

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
        return res.json(resHelpers.fail('The rule could not be populated.'));
      }

      evaluateRule(populatedRule, (evalErr, sandbox) => {
        if (evalErr) {
          return res.json(resHelpers.fail(
            'The rule could not be evaluated. Check validation.',
            null,
            {
              validation: {
                rule: {
                  message: evalErr,
                },
              },
            }
          ));
        }

        res.json(resHelpers.success(
          'The rule was successfully evaluated.',
          sandbox
        ));
      });
    });
  });
});

module.exports = router;
