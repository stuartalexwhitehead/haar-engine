const mongoose = require('mongoose');

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
  address64: {
    type: String,
    required: 'A 64-bit address is required.',
    unique: true,
    maxlength: [
      16,
      'The 64-bit address must be 16 hexadecimal characters',
    ],
    minlength: [
      16,
      'The 64-bit address must be 16 hexadecimal characters',
    ],
  },
});

module.exports = mongoose.model('Device', deviceSchema);
