const assert = require('chai').assert;
const UserModel = require('../../lib/models/user');
const mongoose = require('mongoose');

describe('User model', function() {

  before(function (done) {

    function clearDB() {
      for (var i in mongoose.connection.collections) {
        mongoose.connection.collections[i].remove(function() {});
      }
      return done();
    }


    if (mongoose.connection.readyState === 0) {
      mongoose.connect(`mongodb://${process.env.HAAR_ENGINE_MONGO_PORT_27017_TCP_ADDR}/haar`, function (err) {
        if (err) {
          throw err;
        }
        return clearDB();
      });
    } else {
      return clearDB();
    }
  });

  describe('#create', function() {
    it('should create a new user', function(done) {
      UserModel.create({
        name: {
          given: 'Test',
          family: 'User',
        },
        username: 'tester',
        password: 'test123',
        email: 'test@example.com',
      }, function (err, createdUser) {
        assert.isNull(err);
        assert.equal(createdUser.name.given, 'Test');
        assert.equal(createdUser.name.family, 'User');
        done();
      });
    });
  });

  describe('#pre', function() {
    it('should hash password', function(done) {

      UserModel.findOne({ username: 'tester'}, function(err, doc) {
        assert.isNull(err);
        assert.notEqual(doc.password, 'test123');
        done();
      });
    });
  });

  describe('#comparePassword', function() {
    it('should compare password', function(done) {

      UserModel.findOne({ username: 'tester'}, function(err, doc) {
        doc.comparePassword('test123', function(err, isMatch) {
          assert.isNull(err);
          assert.isOk(isMatch);
          done();
        });
      });
    });
  });
});
