const mongoose = require('mongoose');
const { ROLES, BRANCHES } = require('../../config/constants');

const NOTIFICATION_TYPES = {
  TASK_ASSIGNED: 'task_assigned',
  TASK_OVERDUE: 'task_overdue',
  SLA_ESCALATION: 'sla_escalation',
  CALLBACK_DUE: 'callback_due',
  REACHOUT_LOGGED: 'reachout_logged',
};

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientRole: {
      type: String,
      enum: Object.values(ROLES),
    },
    branch: {
      type: String,
      enum: [BRANCHES.BENGALURU, BRANCHES.MYSURU, BRANCHES.BELAGAVI, BRANCHES.ALL],
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
      index: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PipelineStudent',
      default: null,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    actionLink: {
      type: String,
      default: '',
      trim: true,
    },
    dedupKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
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

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = {
  Notification,
  NOTIFICATION_TYPES,
};
