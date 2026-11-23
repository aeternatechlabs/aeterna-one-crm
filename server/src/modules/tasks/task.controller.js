const Task = require('./task.model');
const User = require('../users/user.model');
const { asyncHandler, ApiError, ApiResponse } = require('../../utils/devilWrapper');
const { ROLES, BRANCHES, TASK_STATUSES, DISPOSITION_OUTCOMES } = require('../../config/constants');
const {
  validateCreateTask,
  validateReachoutLog,
  validateCompleteTask,
} = require('./task.validator');

const ALLOWED_TASK_FIELDS = new Set([
  '_id',
  'title',
  'description',
  'taskType',
  'priority',
  'status',
  'dueDate',
  'assignedTo',
  'assignedToName',
  'assignedBy',
  'assignedByName',
  'branch',
  'leadId',
  'studentId',
  'candidateName',
  'candidatePhone',
  'candidateEmail',
  'candidateProgram',
  'smartReachout',
  'completedAt',
  'completedBy',
  'completedByName',
  'completionOutcome',
  'completionNotes',
  'isEscalated',
  'escalatedAt',
  'escalationReason',
  'createdAt',
  'updatedAt',
]);

const getTasks = asyncHandler(async (req, res) => {
  const {
    branch,
    status,
    priority,
    taskType,
    assignedTo,
    search,
    fields,
    page = 1,
    limit = 20,
    scope,
  } = req.query;

  const filter = { isDeleted: false };

  if (req.branchScope && req.branchScope !== 'all') {
    filter.branch = req.branchScope;
  } else if (branch && branch !== 'all') {
    filter.branch = branch;
  }

  if (req.user.role === ROLES.COUNSELLOR && scope !== 'branch') {
    filter.assignedTo = req.user._id;
  } else if (assignedTo) {
    filter.assignedTo = assignedTo;
  }

  if (status && Object.values(TASK_STATUSES).includes(status)) {
    filter.status = status;
  }

  if (priority) {
    filter.priority = priority;
  }

  if (taskType) {
    filter.taskType = taskType;
  }

  if (search && search.trim()) {
    const term = search.trim();
    if (term.length > 50) {
      throw new ApiError(400, 'Search query cannot exceed 50 characters.');
    }
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { title: { $regex: escaped, $options: 'i' } },
      { candidateName: { $regex: escaped, $options: 'i' } },
      { candidatePhone: { $regex: escaped, $options: 'i' } },
      { candidateEmail: { $regex: escaped, $options: 'i' } },
    ];
  }

  const parsedLimit = parseInt(limit, 10);
  const safeLimit = isNaN(parsedLimit) || parsedLimit <= 0 ? 20 : Math.min(parsedLimit, 100);
  const parsedPage = parseInt(page, 10);
  const safePage = isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;
  const skip = (safePage - 1) * safeLimit;

  let query = Task.find(filter).sort({ dueDate: 1, priority: -1 }).skip(skip).limit(safeLimit);

  if (fields) {
    const fieldList = fields
      .split(',')
      .map((f) => f.trim())
      .filter((f) => ALLOWED_TASK_FIELDS.has(f) && f !== '-__v');
    if (fieldList.length > 0) {
      query = query.select(fieldList.join(' '));
    }
  } else {
    query = query.select('-smartReachout.quickDispositionHistory');
  }

  const [tasks, total] = await Promise.all([
    query.lean(),
    Task.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      tasks,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit) || 1,
      },
    })
  );
});

const getDailyQueue = asyncHandler(async (req, res) => {
  const { branch } = req.query;
  const filter = {
    isDeleted: false,
    status: { $in: [TASK_STATUSES.PENDING, TASK_STATUSES.IN_PROGRESS] },
  };

  if (req.branchScope && req.branchScope !== 'all') {
    filter.branch = req.branchScope;
  } else if (branch && branch !== 'all') {
    filter.branch = branch;
  }

  if (req.user.role === ROLES.COUNSELLOR) {
    filter.assignedTo = req.user._id;
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const completedTodayFilter = {
    isDeleted: false,
    status: TASK_STATUSES.COMPLETED,
    completedAt: { $gte: startOfDay, $lte: endOfDay },
  };
  if (filter.branch) completedTodayFilter.branch = filter.branch;
  if (filter.assignedTo) completedTodayFilter.completedBy = filter.assignedTo;

  const [queueTasks, completedTodayCount, totalActiveCount] = await Promise.all([
    Task.find(filter)
      .sort({ dueDate: 1, priority: -1 })
      .limit(100)
      .select('-smartReachout.quickDispositionHistory')
      .lean(),
    Task.countDocuments(completedTodayFilter),
    Task.countDocuments(filter),
  ]);

  const overdue = [];
  const dueToday = [];
  const upcoming = [];

  for (const t of queueTasks) {
    const taskDue = new Date(t.dueDate);
    if (taskDue < startOfDay) {
      overdue.push(t);
    } else if (taskDue <= endOfDay) {
      dueToday.push(t);
    } else {
      upcoming.push(t);
    }
  }

  res.status(200).json(
    new ApiResponse(200, {
      queue: {
        overdue,
        dueToday,
        upcoming,
      },
      stats: {
        totalActive: totalActiveCount,
        overdueCount: overdue.length,
        dueTodayCount: dueToday.length,
        upcomingCount: upcoming.length,
        completedTodayCount,
        dailyTarget: 25,
      },
    })
  );
});

const getTaskById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const task = await Task.findOne({ _id: id, isDeleted: false }).lean();

  if (!task) {
    throw new ApiError(404, 'Task not found.');
  }

  if (
    req.branchScope &&
    req.branchScope !== 'all' &&
    task.branch !== req.branchScope
  ) {
    throw new ApiError(
      403,
      `Access denied: Task belongs to branch '${task.branch}'. You are scoped to '${req.branchScope}'.`
    );
  }

  res.status(200).json(new ApiResponse(200, task));
});

const createTask = asyncHandler(async (req, res) => {
  validateCreateTask(req.body);

  let branch = req.body.branch;
  if (req.user.role !== ROLES.SUPER_ADMIN && req.user.branch !== BRANCHES.ALL) {
    branch = req.user.branch;
  } else if (!branch) {
    branch = req.user.branch !== BRANCHES.ALL ? req.user.branch : BRANCHES.BENGALURU;
  }

  let assignedTo = req.body.assignedTo || req.user._id;
  let assignedToName = req.body.assignedToName || '';

  if (req.body.assignedTo && req.body.assignedTo !== String(req.user._id)) {
    const assignee = await User.findById(req.body.assignedTo).select('name branch').lean();
    if (!assignee) {
      throw new ApiError(404, 'Assigned staff user not found.');
    }
    if (
      req.user.role !== ROLES.SUPER_ADMIN &&
      assignee.branch !== branch &&
      assignee.branch !== BRANCHES.ALL
    ) {
      throw new ApiError(400, 'Cannot assign task to staff in a different branch.');
    }
    assignedToName = assignee.name;
  } else if (!assignedToName) {
    assignedToName = req.user.name;
  }

  const taskData = {
    title: req.body.title.trim(),
    description: (req.body.description || '').trim(),
    taskType: req.body.taskType,
    priority: req.body.priority,
    dueDate: new Date(req.body.dueDate),
    assignedTo,
    assignedToName,
    assignedBy: req.user._id,
    assignedByName: req.user.name,
    branch,
    leadId: req.body.leadId || null,
    studentId: req.body.studentId || null,
    candidateName: req.body.candidateName.trim(),
    candidatePhone: (req.body.candidatePhone || '').trim(),
    candidateEmail: (req.body.candidateEmail || '').trim().toLowerCase(),
    candidateProgram: (req.body.candidateProgram || '').trim(),
    smartReachout: {
      preferredChannel: req.body.preferredChannel || 'whatsapp',
      reachoutCount: 0,
      quickDispositionHistory: [],
    },
  };

  const task = await Task.create(taskData);

  res.status(201).json(new ApiResponse(201, task));
});

const updateTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const task = await Task.findOne({ _id: id, isDeleted: false });

  if (!task) {
    throw new ApiError(404, 'Task not found.');
  }

  if (
    req.branchScope &&
    req.branchScope !== 'all' &&
    task.branch !== req.branchScope
  ) {
    throw new ApiError(403, 'Access denied: Cannot update task of another branch.');
  }

  if (req.body.assignedTo && String(req.body.assignedTo) !== String(task.assignedTo)) {
    if (
      req.user.role !== ROLES.SUPER_ADMIN &&
      req.user.role !== ROLES.BRANCH_MANAGER
    ) {
      throw new ApiError(403, 'Only Branch Managers and Super Admins can reassign tasks.');
    }
    const assignee = await User.findById(req.body.assignedTo).select('name branch').lean();
    if (!assignee) {
      throw new ApiError(404, 'New assignee not found.');
    }
    task.assignedTo = assignee._id;
    task.assignedToName = assignee.name;
  }

  if (req.body.title && typeof req.body.title === 'string') {
    task.title = req.body.title.trim();
  }
  if (req.body.description !== undefined) {
    task.description = String(req.body.description).trim();
  }
  if (req.body.priority) {
    task.priority = req.body.priority;
  }
  if (req.body.taskType) {
    task.taskType = req.body.taskType;
  }
  if (req.body.dueDate) {
    const parsed = new Date(req.body.dueDate);
    if (!isNaN(parsed.getTime())) {
      task.dueDate = parsed;
    }
  }
  if (req.body.status && Object.values(TASK_STATUSES).includes(req.body.status)) {
    task.status = req.body.status;
  }

  await task.save();

  res.status(200).json(new ApiResponse(200, task));
});

const logReachout = asyncHandler(async (req, res) => {
  validateReachoutLog(req.body);
  const { id } = req.params;

  const task = await Task.findOne({ _id: id, isDeleted: false });
  if (!task) {
    throw new ApiError(404, 'Task not found.');
  }

  if (
    req.branchScope &&
    req.branchScope !== 'all' &&
    task.branch !== req.branchScope
  ) {
    throw new ApiError(403, 'Access denied: Task belongs to another branch.');
  }

  const { channel, outcomeCode, notes, nextFollowupHours, markComplete } = req.body;

  let nextFollowup = null;
  if (nextFollowupHours) {
    nextFollowup = new Date(Date.now() + Number(nextFollowupHours) * 3600000);
  }

  const dispositionEntry = {
    timestamp: new Date(),
    actorId: req.user._id,
    actorName: req.user.name,
    channel,
    outcomeCode,
    notes: (notes || '').trim(),
    nextScheduledFollowup: nextFollowup,
  };

  task.smartReachout.reachoutCount = (task.smartReachout.reachoutCount || 0) + 1;
  task.smartReachout.lastContactedAt = new Date();
  task.smartReachout.lastChannelUsed = channel;
  task.smartReachout.latestOutcome = outcomeCode;
  task.smartReachout.quickDispositionHistory.push(dispositionEntry);

  if (markComplete || outcomeCode === DISPOSITION_OUTCOMES.CONNECTED_INTERESTED) {
    task.status = TASK_STATUSES.COMPLETED;
    task.completedAt = new Date();
    task.completedBy = req.user._id;
    task.completedByName = req.user.name;
    task.completionOutcome = outcomeCode;
    task.completionNotes = (notes || '').trim() || 'Reach-out successfully logged';
  } else if (
    (outcomeCode === DISPOSITION_OUTCOMES.NO_ANSWER ||
      outcomeCode === DISPOSITION_OUTCOMES.BUSY) &&
    nextFollowup
  ) {
    task.dueDate = nextFollowup;
  }

  await task.save();

  res.status(200).json(new ApiResponse(200, task));
});

const completeTask = asyncHandler(async (req, res) => {
  validateCompleteTask(req.body);
  const { id } = req.params;

  const task = await Task.findOne({ _id: id, isDeleted: false });
  if (!task) {
    throw new ApiError(404, 'Task not found.');
  }

  if (
    req.branchScope &&
    req.branchScope !== 'all' &&
    task.branch !== req.branchScope
  ) {
    throw new ApiError(403, 'Access denied: Task belongs to another branch.');
  }

  task.status = TASK_STATUSES.COMPLETED;
  task.completedAt = new Date();
  task.completedBy = req.user._id;
  task.completedByName = req.user.name;
  task.completionOutcome = req.body.outcome.trim();
  task.completionNotes = req.body.notes.trim();

  await task.save();

  res.status(200).json(new ApiResponse(200, task));
});

const deleteTask = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (
    req.user.role !== ROLES.SUPER_ADMIN &&
    req.user.role !== ROLES.BRANCH_MANAGER
  ) {
    throw new ApiError(403, 'Only Branch Managers and Super Admins can delete tasks.');
  }

  const task = await Task.findOne({ _id: id, isDeleted: false });
  if (!task) {
    throw new ApiError(404, 'Task not found.');
  }

  if (
    req.branchScope &&
    req.branchScope !== 'all' &&
    task.branch !== req.branchScope
  ) {
    throw new ApiError(403, 'Access denied: Cannot delete task of another branch.');
  }

  task.isDeleted = true;
  task.deletedAt = new Date();
  task.deletedBy = req.user._id;

  await task.save();

  res.status(200).json(new ApiResponse(200, { message: 'Task deleted successfully.' }));
});

module.exports = {
  getTasks,
  getDailyQueue,
  getTaskById,
  createTask,
  updateTask,
  logReachout,
  completeTask,
  deleteTask,
};
