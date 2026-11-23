const mongoose = require('mongoose');
const { BRANCHES } = require('../../config/constants');
const { ALLOWED_DOCUMENT_CATEGORIES } = require('./fileValidation');

const documentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
      index: true,
    },
    studentIdCode: {
      type: String,
      trim: true,
      index: true,
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
    category: {
      type: String,
      enum: {
        values: Array.from(ALLOWED_DOCUMENT_CATEGORIES),
        message: 'Invalid document category: {VALUE}',
      },
      required: [true, 'Category is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
      min: [0, 'File size cannot be negative'],
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
      trim: true,
    },
    storageKey: {
      type: String,
      required: [true, 'Storage key is required'],
      trim: true,
    },
    storageProvider: {
      type: String,
      default: 'local',
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedByName: {
      type: String,
      trim: true,
      default: '',
    },
    verifiedAt: {
      type: Date,
    },
    verificationNotes: {
      type: String,
      trim: true,
      default: '',
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: '',
    },
    stageGateRequirement: {
      type: String,
      trim: true,
      default: '',
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    retentionYears: {
      type: Number,
      default: 7,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

documentSchema.index({ student: 1, category: 1, isDeleted: 1 });
documentSchema.index({ branch: 1, isDeleted: 1 });

module.exports = mongoose.model('Document', documentSchema);
