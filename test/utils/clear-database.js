const mongoose = require('mongoose');
const initDb = require('../../lib/app/initDatabase');

function clearDatabase(cb) {
  initDb(function () {
    for (var i in mongoose.connection.collections) {
      mongoose.connection.collections[i].remove(function() {});
    }
    
    cb(null, null);
  });
}

module.exports = clearDatabase;
