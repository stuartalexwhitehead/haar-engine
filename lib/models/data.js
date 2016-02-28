const mongoose = require('mongoose');

const schemaOptions = {
  timestamps: true,
};

const dataValueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: 'Data value name is required.',
    validate: {
      validator(v) {
        return /^[a-z]+$/.test(v);
      },
      message: '{VALUE} must be lowercase letters only.',
    },
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: 'A data value is required.',
  },
});

const dataSchema = new mongoose.Schema({
  device: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: 'Device is required.',
  },
  data: {
    type: [dataValueSchema],
    required: 'At least one data value is required.',
  },
}, schemaOptions);

module.exports = mongoose.model('Data', dataSchema);
