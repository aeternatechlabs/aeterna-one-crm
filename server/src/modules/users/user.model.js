const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES, BRANCHES } = require('../../config/constants');
const { PASSWORD_POLICY, validatePasswordComplexity } = require('../../utils/passwordPolicy');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
      validate: {
        validator: function (val) {
          if (!val) return false;
          // If already a bcrypt hash (e.g. from migrations, seeds, or reload), preserve it
          if (typeof val === 'string' && (val.startsWith('$2a$') || val.startsWith('$2b$'))) {
            return true;
          }
          return validatePasswordComplexity(val).valid;
        },
        message: PASSWORD_POLICY.ERROR_MESSAGE,
      },
    },
    role: {
      type: String,
      enum: {
        values: Object.values(ROLES),
        message: 'Invalid user role: {VALUE}',
      },
      default: ROLES.COUNSELLOR,
      index: true,
    },
    branch: {
      type: String,
      enum: {
        values: Object.values(BRANCHES),
        message: 'Invalid branch: {VALUE}',
      },
      default: BRANCHES.BENGALURU,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastLogin: {
      type: Date,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    tokenVersion: {
      type: Number,
      default: 0,
      index: true,
    },
    resetOTP: {
      type: String,
      select: false,
    },
    resetOTPExpires: {
      type: Date,
      select: false,
    },
    resetToken: {
      type: String,
      select: false,
    },
    resetTokenExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.failedLoginAttempts;
        delete ret.lockUntil;
        delete ret.tokenVersion;
        delete ret.resetOTP;
        delete ret.resetOTPExpires;
        delete ret.resetToken;
        delete ret.resetTokenExpires;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.failedLoginAttempts;
        delete ret.lockUntil;
        delete ret.tokenVersion;
        delete ret.resetOTP;
        delete ret.resetOTPExpires;
        delete ret.resetToken;
        delete ret.resetTokenExpires;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// SEC-01: Partial unique index to strictly guarantee at most ONE Super Admin in the system
userSchema.index(
  { role: 1 },
  {
    unique: true,
    partialFilterExpression: { role: ROLES.SUPER_ADMIN },
    name: 'unique_super_admin_role',
  }
);

// SEC-06: Compound index for branch/role directory queries & text search index
userSchema.index({ branch: 1, role: 1, createdAt: -1 });
userSchema.index({ name: 'text', email: 'text' }, { name: 'users_text_search' });

// Hash password before saving and invalidate sessions on password change
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  if (!this.isNew) {
    // SEC-04: Password change invalidates all existing JWT sessions
    this.tokenVersion = (this.tokenVersion || 0) + 1;
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password instance method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// SEC-03: Check if account is temporarily locked due to brute-force attempts
userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

// SEC-03: Atomically increment failed login counter and enforce 15-minute lock after 5 consecutive failures
userSchema.methods.recordFailedLogin = async function () {
  const now = new Date();
  return User.findOneAndUpdate(
    { _id: this._id },
    [
      {
        $set: {
          failedLoginAttempts: {
            $cond: {
              if: { $and: [{ $ne: ['$lockUntil', null] }, { $lte: ['$lockUntil', now] }] },
              then: 1,
              else: { $add: [{ $ifNull: ['$failedLoginAttempts', 0] }, 1] },
            },
          },
          lockUntil: {
            $cond: {
              if: {
                $gte: [
                  {
                    $cond: {
                      if: { $and: [{ $ne: ['$lockUntil', null] }, { $lte: ['$lockUntil', now] }] },
                      then: 1,
                      else: { $add: [{ $ifNull: ['$failedLoginAttempts', 0] }, 1] },
                    },
                  },
                  5,
                ],
              },
              then: new Date(now.getTime() + 15 * 60 * 1000),
              else: null,
            },
          },
        },
      },
    ],
    { new: true }
  );
};

// SEC-03: Reset failed login tracking and record successful login timestamp
userSchema.methods.resetFailedLogin = async function () {
  return User.updateOne(
    { _id: this._id },
    {
      $set: {
        failedLoginAttempts: 0,
        lockUntil: null,
        lastLogin: new Date(),
      },
    }
  );
};

const User = mongoose.model('User', userSchema);

module.exports = User;
