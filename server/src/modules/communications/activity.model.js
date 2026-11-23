const mongoose = require('mongoose');
const { BRANCHES, REACHOUT_CHANNELS } = require('../../config/constants');

const communicationActivitySchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      enum: [...Object.values(REACHOUT_CHANNELS), 'in_person'],
      required: true,
    },
    direction: {
      type: String,
      enum: ['outbound', 'inbound'],
      default: 'outbound',
    },
    recipient: {
      type: String,
      required: true,
      trim: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PipelineStudent',
      default: null,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
      index: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorName: {
      type: String,
      default: '',
      trim: true,
    },
    branch: {
      type: String,
      enum: [BRANCHES.BENGALURU, BRANCHES.MYSURU, BRANCHES.BELAGAVI],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['queued', 'sent', 'delivered', 'failed', 'dry_run'],
      default: 'sent',
    },
    providerMessageId: {
      type: String,
      default: null,
    },
    outcomeCode: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
    dedupKey: {
      type: String,
      unique: true,
      sparse: true,
    },
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
  }
);

communicationActivitySchema.index({ branch: 1, createdAt: -1 });
communicationActivitySchema.index({ studentId: 1, createdAt: -1 });
communicationActivitySchema.index({ leadId: 1, createdAt: -1 });

const CommunicationActivity = mongoose.model(
  'CommunicationActivity',
  communicationActivitySchema
);

module.exports = CommunicationActivity;
