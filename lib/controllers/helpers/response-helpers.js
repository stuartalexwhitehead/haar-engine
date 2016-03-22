const _ = require('lodash');
const mapValidationErrors = require('./map-validation-errors');

function success(message = 'Success.', data = null, meta = {}) {
  return {
    status: 'success',
    meta: _.merge({
      message,
    }, meta),
    data,
  };
}

function fail(message = 'Fail.', data = null, meta = {}) {
  return {
    status: 'fail',
    meta: _.merge({
      message,
    }, meta),
    data,
  };
}

function validationFail(message = 'Validation Fail.', errors = {}, values = {}) {
  return {
    status: 'fail',
    meta: {
      message,
      validation: {
        errors: mapValidationErrors(errors, values),
        values,
      },
    },
    data: null,
  };
}

function error(message = 'Error.', data = null, meta = {}) {
  return {
    status: 'error',
    meta: _.merge({
      message,
    }, meta),
    data,
  };
}

module.exports = {
  success,
  fail,
  validationFail,
  error,
};
