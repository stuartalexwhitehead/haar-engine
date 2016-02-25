const mongoose = require('mongoose');

const dataDescriptorSchema = new mongoose.Schema({
  label: {
    type: String,
    required: 'Data value label is required.',
  },
  description: {
    type: String,
  },
  unit: {
    type: String,
  },
  max: {
    type: Number,
  },
  min: {
    type: Number,
  },
});

const deviceTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'Device type name is required.',
  },
  description: {
    type: String,
  },
  developer: {
    type: String,
    trim: true,
  },
  deviceClass: {
    type: String,
    enum: {
      values: ['input', 'output'],
      message: 'Device class must be "input" or "output"',
    },
    required: 'Device class is required',
  },
  dataDescriptor: [dataDescriptorSchema],
});

module.exports = mongoose.model('Device Type', deviceTypeSchema);
