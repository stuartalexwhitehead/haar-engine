const _ = require('lodash');

function mapValidationErrors(errors, values) {
  const valueMap = Object.keys(values).reduce((prev, curr) => {
    const val = {};
    val[curr] = {
      value: values[curr],
    };

    return Object.assign({}, prev, val);
  }, {});

  const errorMap = Object.keys(errors).reduce((prev, curr) => {
    if (errors[curr].name && errors[curr].name === 'ValidatorError') {
      const val = {};
      val[curr] = {
        message: errors[curr].message,
      };

      return Object.assign({}, prev, val);
    }
  }, {});

  return _.merge({}, errorMap, valueMap);
}

module.exports = mapValidationErrors;
