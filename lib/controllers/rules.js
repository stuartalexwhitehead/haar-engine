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
  const { query } = req;
  if (!query.device) {
    return res.json(resHelpers.fail('You have not provided an output device ID.'));
  }

  DeviceModel.findById(query.device, (err, device) => {
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

    const page = query.page || 1;
    const limit = 20;
    const filters = {
      name: query.name,
      enabled: query.enabled,
    };
    const sort = query.sort || 'enabled';
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

    criteria.output = device._id.toString();

    async.parallel({
      total: function total(cb) {
        RuleModel.find(criteria).count(cb);
      },
      rules: function rules(cb) {
        RuleModel
          .find(criteria)
          .skip(limit * (page - 1))
          .limit(limit)
          .populate('input output')
          .sort({
            [sort]: order,
          })
          .lean()
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
        'Rules were found',
        result.rules,
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
});

router.put('/rules/:rule', (req, res) => {
  RuleModel.findById(req.params.rule, (err, rule) => {
    if (err) {
      return res.json(resHelpers.error('The rule could not be updated.'));
    }

    if (rule === null) {
      return res.json(resHelpers.fail('The rule was not found and could not be updated.'));
    }

    rule.set(req.body).validate(valErr => {
      if (valErr && valErr.name && valErr.name === 'ValidationError') {
        return res.json(resHelpers.validationFail(
          'The rule could not be updated. Check validation.',
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

          populatedRule.save((saveErr, doc) => {
            if (saveErr) {
              return res.json(resHelpers.error('The rule could not be updated.'));
            }

            res.json(resHelpers.success(
              'The rule was updated.',
              doc.toObject()
            ));
          });
        });
      });
    });
  });
});

router.put('/rules/:rule/enable', (req, res) => {
  RuleModel.findById(req.params.rule, (err, rule) => {
    if (err) {
      return res.json(resHelpers.error('The rule could not be enabled.'));
    }

    if (rule === null) {
      return res.json(resHelpers.fail('The rule was not found and could not be enabled.'));
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

      const hasInputAuth = populatedRule.input.visibility === 'public'
        || req.jwt && populatedRule.input.owner.toString() === req.jwt.id;
      const hasOutputAuth = req.jwt && populatedRule.output.owner.toString() === req.jwt.id;

      if (!hasInputAuth || !hasOutputAuth) {
        return res.json(resHelpers.fail('You are not authorised.'));
      }

      RuleModel.update({
        output: rule.output,
        enabled: true,
      }, {
        enabled: false,
      }, updateErr => {
        rule.set({ enabled: true }).save((saveErr, doc) => {
          if (updateErr || saveErr) {
            return res.json(resHelpers.error('The rule could not be enabled.'));
          }

          res.json(resHelpers.success(
            'The rule was enabled.',
            doc.toObject()
          ));
        });
      });
    });
  });
});

router.put('/rules/:rule/disable', (req, res) => {
  RuleModel.findById(req.params.rule, (err, rule) => {
    if (err) {
      return res.json(resHelpers.error('The rule could not be disabled.'));
    }

    if (rule === null) {
      return res.json(resHelpers.fail('The rule was not found and could not be disabled.'));
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

      const hasInputAuth = populatedRule.input.visibility === 'public'
        || req.jwt && populatedRule.input.owner.toString() === req.jwt.id;
      const hasOutputAuth = req.jwt && populatedRule.output.owner.toString() === req.jwt.id;

      if (!hasInputAuth || !hasOutputAuth) {
        return res.json(resHelpers.fail('You are not authorised.'));
      }

      rule.set({ enabled: false }).save((saveErr, doc) => {
        if (saveErr) {
          return res.json(resHelpers.error('The rule could not be disabled.'));
        }

        res.json(resHelpers.success(
          'The rule was disabled.',
          doc.toObject()
        ));
      });
    });
  });
});

router.delete('/rules/:rule', (req, res) => {
  RuleModel.findById(req.params.rule, (err, rule) => {
    if (err) {
      return res.json(resHelpers.error('The rule could not be deleted.'));
    }

    if (rule === null) {
      return res.json(resHelpers.fail('The rule was not found and could not be deleted.'));
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

      const hasInputAuth = populatedRule.input.visibility === 'public'
        || req.jwt && populatedRule.input.owner.toString() === req.jwt.id;
      const hasOutputAuth = req.jwt && populatedRule.output.owner.toString() === req.jwt.id;

      if (!hasInputAuth || !hasOutputAuth) {
        return res.json(resHelpers.fail('You are not authorised.'));
      }

      rule.remove((removeErr, doc) => {
        if (removeErr) {
          return res.json(resHelpers.error('The rule could not be deleted.'));
        }

        res.json(resHelpers.success(
          'The rule was deleted.',
          doc.toObject()
        ));
      });
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
