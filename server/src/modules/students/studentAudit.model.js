const mongoose = require('mongoose');

const studentAuditSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    studentIdCode: {
      type: String,
      trim: true,
      index: true,
    },
    branch: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'ACADEMIC_RECORD_ADDED',
        'ACADEMIC_RECORD_UPDATED',
        'TEST_SCORE_ADDED',
        'TEST_SCORE_VERIFIED',
        'FINANCIAL_BUDGET_UPDATED',
        'LOAN_SANCTION_UPDATED',
        'VISA_REFUSAL_UPDATED',
        'PREFERENCES_UPDATED',
        'SHORTLIST_UPDATED',
        'NOTE_ADDED',
        'STATUS_TRANSITION',
      ],
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actorName: {
      type: String,
      default: 'Staff',
    },
    actorRole: {
      type: String,
      default: '',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

studentAuditSchema.index({ student: 1, createdAt: -1 });
studentAuditSchema.index({ branch: 1, createdAt: -1 });

module.exports = mongoose.model('StudentAudit', studentAuditSchema);
