const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'A rule name is required.',
  },
  description: {
    type: String,
    trim: true,
  },
  input: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: 'An input device is required.',
  },
  output: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: 'An output device is required.',
  },
  rule: {
    type: String,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model('Rule', ruleSchema);
