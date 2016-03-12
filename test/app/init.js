const should = require('should');

const config = require('../utils/haar-config');

describe('Haar', function() {
  describe('config settings', function() {
    it('should not exist', function() {
      const haar = require('../../index');

      should(haar.app).be.undefined();
      should(haar.server).be.undefined();
      should(haar.io).be.undefined();
      should(haar.db).be.undefined();
      should(haar.init).be.Function();
    });

    it('should expose modules', function() {
      const haar = require('../../index');
      haar.init(config);

      should(haar.app).not.be.undefined();
      should(haar.server).not.be.undefined();
      should(haar.io).not.be.undefined();
      should(haar.db).not.be.undefined();
    });
  });
});
