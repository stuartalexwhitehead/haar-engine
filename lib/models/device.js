const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    require: 'Device name is required.',
  },
  description: {
    type: String,
    trim: true,
  },
  deviceType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device Type',
    required: 'Device type is required.',
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: 'Owner is required.',
  },
});

module.exports = mongoose.model('Device', deviceSchema);
