const mongoose = require('mongoose');

const schemaOptions = {
  timestamps: true,
};

const deviceSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'Device name is required.',
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
  visibility: {
    type: String,
    enum: {
      values: ['public', 'private'],
      message: 'Device visibility must be "public" or "private"',
    },
  },
  address: {
    type: String,
    required: 'A device address is required.',
    unique: true,
  },
}, schemaOptions);

module.exports = mongoose.model('Device', deviceSchema);
