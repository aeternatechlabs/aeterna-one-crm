const mongoose = require('mongoose');
const { BRANCHES } = require('../../config/constants');

const INSTITUTION_TYPES = ['school', 'college', 'coaching_institute', 'university'];

const PARTNERSHIP_STATUSES = [
  'Prospective',
  'Active MoU',
  'Partner',
  'Campus Visited',
  'Inactive',
];

const institutionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Institution name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [120, 'Name cannot exceed 120 characters'],
      unique: true,
      index: true,
    },
    institution_type: {
      type: String,
      required: [true, 'Institution type is required (school, college, coaching_institute, or university)'],
      enum: {
        values: INSTITUTION_TYPES,
        message: 'Invalid institution type. Permitted: school, college, coaching_institute, university',
      },
      index: true,
    },
    category: {
      type: String,
      trim: true,
      default: '',
    },
    branch: {
      type: String,
      enum: Object.values(BRANCHES),
      default: BRANCHES.BENGALURU,
      index: true,
    },
    board_or_affiliation: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      index: true,
    },
    state: {
      type: String,
      trim: true,
      default: 'Karnataka',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    contact_person: {
      name: { type: String, trim: true, default: '' },
      designation: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, lowercase: true, default: '' },
    },
    official_email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    official_phone: {
      type: String,
      trim: true,
      default: '',
    },
    website: {
      type: String,
      trim: true,
      default: '',
    },
    student_intake_capacity: {
      type: String,
      trim: true,
      default: '',
    },
    target_destinations: {
      type: [String],
      default: ['United Kingdom', 'United States', 'Canada', 'Australia', 'Germany', 'Ireland'],
    },
    partnership_status: {
      type: String,
      enum: PARTNERSHIP_STATUSES,
      default: 'Prospective',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    deletionStage: {
      type: String,
      enum: ['ACTIVE', 'TRASH'],
      default: 'ACTIVE',
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound text search index for fast name, city, contact person lookup
institutionSchema.index(
  {
    name: 'text',
    city: 'text',
    'contact_person.name': 'text',
    board_or_affiliation: 'text',
  },
  { name: 'institution_text_search' }
);

const Institution = mongoose.model('Institution', institutionSchema);

module.exports = {
  Institution,
  INSTITUTION_TYPES,
  PARTNERSHIP_STATUSES,
};
