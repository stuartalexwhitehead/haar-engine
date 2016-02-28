const mongoose = require('mongoose');

const dataDescriptorSchema = new mongoose.Schema({
  label: {
    type: String,
    required: 'Data value label is required.',
  },
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
  description: {
    type: String,
  },
  unit: {
    longform: {
      type: String,
    },
    shortform: {
      type: String,
    },
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
  },
  dataDescriptor: {
    type: [dataDescriptorSchema],
    validate: {
      validator(v) {
        return v.reduce((result, descriptor) => Object.create({
          isUnique: result.names.indexOf(descriptor.name) > -1 ? false : true,
          names: result.names.concat([descriptor.name]),
        }),
        { isUnique: true, names: [] }).isUnique;
      },
      message: 'Data Descriptor objects must have unique names.',
    },
  },
});

module.exports = mongoose.model('Device Type', deviceTypeSchema);
