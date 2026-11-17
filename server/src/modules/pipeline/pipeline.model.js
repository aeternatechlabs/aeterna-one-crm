const mongoose = require('mongoose');
const { PIPELINE_STAGES, BRANCHES } = require('../../config/constants');

const pipelineStudentSchema = new mongoose.Schema(
  {
    studentName: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name cannot exceed 80 characters'],
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Student email is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    programme: {
      type: String,
      required: [true, 'Programme is required'],
      trim: true,
    },
    university: {
      type: String,
      trim: true,
      default: '',
    },
    destination: {
      type: String,
      required: [true, 'Destination country is required'],
      trim: true,
      default: 'United Kingdom',
    },
    intake: {
      type: String,
      trim: true,
      default: 'Fall 2026',
    },
    branch: {
      type: String,
      enum: {
        values: [BRANCHES.BENGALURU, BRANCHES.MYSURU, BRANCHES.BELAGAVI],
        message: 'Invalid branch: {VALUE}',
      },
      required: [true, 'Branch is required'],
      index: true,
    },
    stage: {
      type: String,
      enum: {
        values: Object.values(PIPELINE_STAGES),
        message: 'Invalid pipeline stage: {VALUE}',
      },
      default: PIPELINE_STAGES.NEW_ENQUIRY,
      index: true,
    },
    documentsVerified: {
      type: Boolean,
      default: false,
    },
    sopStatus: {
      type: String,
      enum: ['pending', 'drafted', 'reviewed', 'approved'],
      default: 'pending',
    },
    counsellor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    counsellorName: {
      type: String,
      trim: true,
      default: 'Assigned Counsellor',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    stageHistory: [
      {
        fromStage: { type: String, required: true },
        toStage: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: { type: String, default: '' },
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// SEC-06: Compound indexes for fast branch/stage/sorting queries & full text search
pipelineStudentSchema.index({ branch: 1, stage: 1, updatedAt: -1 });
pipelineStudentSchema.index({ branch: 1, stage: 1 });
pipelineStudentSchema.index({ branch: 1, updatedAt: -1 });
pipelineStudentSchema.index({ createdAt: -1 });
pipelineStudentSchema.index(
  {
    studentName: 'text',
    email: 'text',
    programme: 'text',
    university: 'text',
    destination: 'text',
  },
  { name: 'pipeline_text_search' }
);

module.exports = mongoose.model('PipelineStudent', pipelineStudentSchema);
