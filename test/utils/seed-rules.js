require('dotenv').config({ silent: true });
const async = require('async');

const RuleModel = require('../../lib/models/rule');

function seedRules(devices, callback) {
  async.parallel({
    rule: function seedRule (cb) {
      RuleModel.create({
        name: 'Test Rule',
        description: 'A test rule.',
        input: devices.sensor.model._id,
        output: devices.actuator.model._id,
        rule: "output.something = 'test';",
        enabled: true,
      }, cb);
    },
  }, function (err, results) {
    if (err) {
      throw new Error(err);
    }

    callback(err, {
      rule: {
        model: results.rule.toObject(),
      },
    });
  });
}

module.exports = seedRules;
