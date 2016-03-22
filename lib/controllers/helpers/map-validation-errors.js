const qs = require('qs');

function mapValidationErrors(errors) {
  const errorString = Object.keys(errors).reduce((prev, curr) => {
    if (errors[curr].name && errors[curr].name === 'ValidatorError') {
      return `${prev}${curr}=${errors[curr].message}&`;
    }
  }, '');

  const parsedError = qs.parse(errorString, {
    allowDots: true,
  });

  return parsedError;
}

module.exports = mapValidationErrors;
