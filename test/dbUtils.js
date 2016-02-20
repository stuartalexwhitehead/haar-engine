var mongoose = require('mongoose');

before(function (done) {

  function clearDB() {
    for (var i in mongoose.connection.collections) {
      mongoose.connection.collections[i].remove(function() {});
    }
    return done();
  }

  if (mongoose.connection.readyState === 0) {
    require('../lib/app/initDatabase')(function () {
      return clearDB();
    });
  } else {
    return clearDB();
  }
});

after(function (done) {
  mongoose.disconnect();
  return done();
});