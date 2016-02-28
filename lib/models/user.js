const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const SALT_WORK_FACTOR = 10;

const schemaOptions = {
  timestamps: true,
};

const userSchema = new mongoose.Schema({
  name: {
    given: {
      type: String,
      trim: true,
      required: 'First name is required',
    },
    family: {
      type: String,
      trim: true,
      required: 'Last name is required',
    },
  },
  username: {
    type: String,
    required: 'Username is required',
    unique: true,
  },
  password: {
    type: String,
    required: 'Password is required',
  },
  email: {
    type: String,
    required: 'Email address is required',
    validate: {
      validator(v) {
        return /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/.test(v);
      },
      message: '{VALUE} is not a valid email address',
    },
  },
  role: {
    type: String,
    required: true,
    default: 'user',
  },
}, schemaOptions);

userSchema.virtual('name.full').get(function getFullName() {
  return `${this.name.given} ${this.name.family}`;
});

userSchema.pre('save', function hashPasswordOnSave(next) {
  const user = this;

  if (user.isModified('password') === false) {
    return next();
  }

  bcrypt.genSalt(SALT_WORK_FACTOR, (saltError, salt) => {
    if (saltError) {
      return next(saltError);
    }

    bcrypt.hash(user.password, salt, (hashError, hash) => {
      if (hashError) {
        return next(hashError);
      }

      user.password = hash;
      next();
    });
  });
});

userSchema.methods.comparePassword = function comparePassword(candidate, cb) {
  bcrypt.compare(candidate, this.password, (err, isMatch) => {
    if (err) {
      cb(err);
    }

    cb(null, isMatch);
  });
};

module.exports = mongoose.model('User', userSchema);
