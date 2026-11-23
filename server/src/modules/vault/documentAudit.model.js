const mongoose = require('mongoose');

const documentAuditSchema = new mongoose.Schema(
  {
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      index: true,
    },
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
        'DOCUMENT_UPLOAD_INTENT',
        'DOCUMENT_UPLOADED',
        'DOCUMENT_DOWNLOAD_REQUESTED',
        'DOCUMENT_PREVIEW_REQUESTED',
        'DOCUMENT_VERIFIED',
        'DOCUMENT_VERIFICATION_REJECTED',
        'DOCUMENT_SOFT_DELETED',
        'DOCUMENT_PURGED',
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

documentAuditSchema.index({ student: 1, createdAt: -1 });
documentAuditSchema.index({ document: 1, createdAt: -1 });
documentAuditSchema.index({ branch: 1, createdAt: -1 });

module.exports = mongoose.model('DocumentAudit', documentAuditSchema);
