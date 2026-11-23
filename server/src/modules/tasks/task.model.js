const mongoose = require('mongoose');
const {
  BRANCHES,
  TASK_TYPES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  REACHOUT_CHANNELS,
  DISPOSITION_OUTCOMES,
} = require('../../config/constants');

const quickDispositionSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actorName: {
      type: String,
      default: '',
      trim: true,
    },
    channel: {
      type: String,
      enum: Object.values(REACHOUT_CHANNELS),
      required: true,
    },
    outcomeCode: {
      type: String,
      enum: Object.values(DISPOSITION_OUTCOMES),
      required: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
    nextScheduledFollowup: {
      type: Date,
      default: null,
    },
  },
  { _id: true, versionKey: false }
);

const smartReachoutSchema = new mongoose.Schema(
  {
    preferredChannel: {
      type: String,
      enum: Object.values(REACHOUT_CHANNELS),
      default: REACHOUT_CHANNELS.WHATSAPP,
    },
    lastContactedAt: {
      type: Date,
      default: null,
    },
    lastChannelUsed: {
      type: String,
      enum: [...Object.values(REACHOUT_CHANNELS), null],
      default: null,
    },
    reachoutCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    latestOutcome: {
      type: String,
      default: null,
    },
    smartTemplateId: {
      type: String,
      default: null,
    },
    quickDispositionHistory: [quickDispositionSchema],
  },
  { _id: false, versionKey: false }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Task title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Task description cannot exceed 1000 characters'],
      default: '',
    },
    taskType: {
      type: String,
      enum: Object.values(TASK_TYPES),
      default: TASK_TYPES.GENERAL_FOLLOWUP,
      required: true,
    },
    priority: {
      type: String,
      enum: Object.values(TASK_PRIORITIES),
      default: TASK_PRIORITIES.MEDIUM,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(TASK_STATUSES),
      default: TASK_STATUSES.PENDING,
      required: true,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Task must be assigned to a staff member'],
      index: true,
    },
    assignedToName: {
      type: String,
      trim: true,
      default: '',
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedByName: {
      type: String,
      trim: true,
      default: '',
    },
    branch: {
      type: String,
      enum: [BRANCHES.BENGALURU, BRANCHES.MYSURU, BRANCHES.BELAGAVI],
      required: [true, 'Branch is required for branch isolation'],
      index: true,
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
    candidateName: {
      type: String,
      required: [true, 'Candidate name is required'],
      trim: true,
      maxlength: 120,
    },
    candidatePhone: {
      type: String,
      trim: true,
      default: '',
    },
    candidateEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    candidateProgram: {
      type: String,
      trim: true,
      default: '',
    },
    smartReachout: {
      type: smartReachoutSchema,
      default: () => ({}),
    },
    completedAt: {
      type: Date,
      default: null,
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    completedByName: {
      type: String,
      default: null,
    },
    completionOutcome: {
      type: String,
      default: null,
    },
    completionNotes: {
      type: String,
      default: null,
      trim: true,
    },
    isEscalated: {
      type: Boolean,
      default: false,
    },
    escalatedAt: {
      type: Date,
      default: null,
    },
    escalationReason: {
      type: String,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
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
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

taskSchema.index({ branch: 1, assignedTo: 1, status: 1, dueDate: 1 });
taskSchema.index({ branch: 1, status: 1, dueDate: 1 });
taskSchema.index({ isDeleted: 1, status: 1, dueDate: 1 });

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
