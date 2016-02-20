const assert = require('chai').assert;

describe('Haar', function() {
  describe('config settings', function() {
    it('should not exist', function() {
      const haar = require('../../index');

      assert.isTrue(typeof haar.app === 'undefined');
      assert.isTrue(typeof haar.server === 'undefined');
      assert.isTrue(typeof haar.io === 'undefined');
      assert.isTrue(typeof haar.db === 'undefined');
      assert.isTrue(typeof haar.init === 'function');
    });

    it('should expose modules', function() {
      const haar = require('../../index');
      haar.init();

      assert.isTrue(typeof haar.app !== 'undefined');
      assert.isTrue(typeof haar.server !== 'undefined');
      assert.isTrue(typeof haar.io !== 'undefined');
      assert.isTrue(typeof haar.db !== 'undefined');
    });
  });
});
