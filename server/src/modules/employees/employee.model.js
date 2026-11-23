const mongoose = require('mongoose');
const { ROLES, BRANCHES } = require('../../config/constants');

const employeeSchema = new mongoose.Schema(
  {
    first_name: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    last_name: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    employee_code: {
      type: String,
      required: [true, 'Employee code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Official email address is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      trim: true,
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
    role: {
      type: String,
      enum: {
        values: Object.values(ROLES),
        message: 'Invalid user role: {VALUE}',
      },
      default: ROLES.COUNSELLOR,
      index: true,
    },
    joining_date: {
      type: Date,
      default: Date.now,
    },
    employment_status: {
      type: String,
      enum: ['Active', 'On Leave', 'Terminated', 'Probation'],
      default: 'Active',
      index: true,
    },
    contact_info: {
      phone: { type: String, trim: true },
      address: { type: String, trim: true },
      emergency_contact_name: { type: String, trim: true },
      emergency_contact_phone: { type: String, trim: true },
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    manager_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    profile_photo: {
      type: String,
      default: null,
    },
    deletionStage: {
      type: String,
      enum: ['ACTIVE', 'TRASH', 'DELETED'],
      default: 'ACTIVE',
      index: true,
    },
    deleteReason: {
      type: String,
      default: null,
      trim: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for employee's full name
employeeSchema.virtual('name').get(function () {
  return `${this.first_name || ''} ${this.last_name || ''}`.trim();
});

// Compound indexes for searching and filtering
employeeSchema.index({ deletionStage: 1, branch: 1, employment_status: 1 });
employeeSchema.index({ first_name: 'text', last_name: 'text', employee_code: 'text', email: 'text' });

const Employee = mongoose.model('Employee', employeeSchema);

module.exports = Employee;
