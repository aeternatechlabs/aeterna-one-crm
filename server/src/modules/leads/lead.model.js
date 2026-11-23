const mongoose = require('mongoose');
const { BRANCHES } = require('../../config/constants');

const LEAD_STATUSES = [
  'New',
  'Assigned',
  'No Answer',
  'Only WhatsApp',
  'Interested',
  'Not Interested',
  'Follow Up',
  'Visited',
  'Deal Closed',
  'Confirm Visitor',
];

const PRIORITY_LEVELS = ['low', 'medium', 'high'];

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Lead name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
      index: true,
    },
    phone_number: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
      index: true,
    },
    branch: {
      type: String,
      enum: {
        values: [BRANCHES.BENGALURU, BRANCHES.MYSURU, BRANCHES.BELAGAVI, BRANCHES.ALL],
        message: 'Invalid branch: {VALUE}',
      },
      default: BRANCHES.BENGALURU,
      index: true,
    },
    department: {
      type: String,
      default: 'Overseas Counselling',
      trim: true,
    },
    destination_country: {
      type: String,
      default: 'United Kingdom',
      trim: true,
    },
    study_level: {
      type: String,
      enum: ["Master's", "Bachelor's", "MBA", "Diploma", "PhD", "Other"],
      default: "Master's",
    },
    intake_target: {
      type: String,
      default: 'Fall 2026',
      trim: true,
    },
    institution_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      default: null,
      index: true,
    },
    institution_name: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      default: '',
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
    current_status: {
      type: String,
      enum: LEAD_STATUSES,
      default: 'New',
      index: true,
    },
    priority: {
      type: String,
      enum: PRIORITY_LEVELS,
      default: 'medium',
      index: true,
    },
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    assigned_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assigned_at: {
      type: Date,
      default: null,
    },
    follow_up_date: {
      type: Date,
      default: null,
      index: true,
    },
    follow_up_time: {
      type: String,
      default: '',
    },
    last_call_date: {
      type: Date,
      default: null,
    },
    total_call_attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    source: {
      type: String,
      enum: ['manual', 'website', 'walk_in', 'google_sheet', 'meta_ads', 'referral', 'pdf_upload'],
      default: 'manual',
      index: true,
    },
    is_locked: {
      type: Boolean,
      default: false,
    },
    converted_to_student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PipelineStudent',
      default: null,
    },
    converted_at: {
      type: Date,
      default: null,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    deletionStage: {
      type: String,
      enum: ['ACTIVE', 'TRASH', 'DELETED'],
      default: 'ACTIVE',
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Lead = mongoose.model('Lead', leadSchema);

module.exports = {
  Lead,
  LEAD_STATUSES,
  PRIORITY_LEVELS,
};
