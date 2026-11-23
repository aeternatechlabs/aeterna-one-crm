const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { mockReqRes } = require('./helpers/testApp');
const {
  ROLES,
  BRANCHES,
  TASK_TYPES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  REACHOUT_CHANNELS,
  DISPOSITION_OUTCOMES,
} = require('../src/config/constants');
const Task = require('../src/modules/tasks/task.model');
const User = require('../src/modules/users/user.model');
const {
  getTasks,
  getDailyQueue,
  getTaskById,
  createTask,
  updateTask,
  logReachout,
  completeTask,
  deleteTask,
} = require('../src/modules/tasks/task.controller');

function invokeHandler(handler, req, res) {
  return new Promise((resolve) => {
    const next = (err) => {
      resolve({ nextCalled: true, nextError: err || null, res });
    };

    const origJson = res.json ? res.json.bind(res) : null;
    res.json = (data) => {
      if (origJson) origJson(data);
      resolve({ nextCalled: false, nextError: null, res });
    };

    try {
      handler(req, res, next);
    } catch (syncErr) {
      resolve({ nextCalled: true, nextError: syncErr, res });
    }
  });
}

describe('Day 46–47: Task Model, Smart Reach-Out Matrix & Backend APIs', () => {
  let origTaskFind;
  let origTaskFindOne;
  let origTaskCreate;
  let origTaskCount;
  let origUserFindById;

  const sampleStaffId = new mongoose.Types.ObjectId();
  const sampleManagerId = new mongoose.Types.ObjectId();
  const sampleTaskId = new mongoose.Types.ObjectId();

  const mockTasks = [
    {
      _id: sampleTaskId,
      title: 'Follow up with Rohan Sharma (UK Sept Intake)',
      description: 'Call regarding CAS document submission',
      taskType: TASK_TYPES.CALL_FOLLOWUP,
      priority: TASK_PRIORITIES.HIGH,
      status: TASK_STATUSES.PENDING,
      dueDate: new Date(Date.now() - 3600000), // Overdue by 1 hour
      assignedTo: sampleStaffId,
      assignedToName: 'Anita Rao',
      branch: BRANCHES.BENGALURU,
      candidateName: 'Rohan Sharma',
      candidatePhone: '+91 98451 12345',
      candidateEmail: 'rohan.sharma@example.com',
      candidateProgram: 'MSc Advanced Computer Science',
      smartReachout: {
        preferredChannel: REACHOUT_CHANNELS.WHATSAPP,
        reachoutCount: 1,
        lastChannelUsed: REACHOUT_CHANNELS.WHATSAPP,
        latestOutcome: DISPOSITION_OUTCOMES.NO_ANSWER,
        quickDispositionHistory: [],
      },
      isDeleted: false,
      save: async function () {
        return this;
      },
    },
    {
      _id: new mongoose.Types.ObjectId(),
      title: 'Review SOP for Ananya Patel',
      description: 'Check SOP structural flow for Rotman MBA',
      taskType: TASK_TYPES.DOC_COLLECTION,
      priority: TASK_PRIORITIES.URGENT,
      status: TASK_STATUSES.PENDING,
      dueDate: new Date(Date.now() + 1800000), // Due in 30 mins (today)
      assignedTo: sampleStaffId,
      assignedToName: 'Anita Rao',
      branch: BRANCHES.BENGALURU,
      candidateName: 'Ananya Patel',
      candidatePhone: '+91 98452 23456',
      candidateEmail: 'ananya.patel@example.com',
      candidateProgram: 'Full-time MBA',
      smartReachout: {
        preferredChannel: REACHOUT_CHANNELS.CALL,
        reachoutCount: 0,
        quickDispositionHistory: [],
      },
      isDeleted: false,
      save: async function () {
        return this;
      },
    },
    {
      _id: new mongoose.Types.ObjectId(),
      title: 'Visa Mock Interview for Mysuru Student',
      description: 'Pre-interview checks',
      taskType: TASK_TYPES.VISA_MOCK_INTERVIEW,
      priority: TASK_PRIORITIES.MEDIUM,
      status: TASK_STATUSES.PENDING,
      dueDate: new Date(Date.now() + 86400000), // Upcoming tomorrow
      assignedTo: new mongoose.Types.ObjectId(),
      assignedToName: 'Pooja Hegde',
      branch: BRANCHES.MYSURU,
      candidateName: 'Darshan Gowda',
      candidatePhone: '+91 98453 34567',
      candidateEmail: 'darshan@example.com',
      candidateProgram: 'MS Data Science',
      smartReachout: {
        preferredChannel: REACHOUT_CHANNELS.WHATSAPP,
        reachoutCount: 0,
        quickDispositionHistory: [],
      },
      isDeleted: false,
      save: async function () {
        return this;
      },
    },
  ];

  beforeEach(() => {
    origTaskFind = Task.find;
    origTaskFindOne = Task.findOne;
    origTaskCreate = Task.create;
    origTaskCount = Task.countDocuments;
    origUserFindById = User.findById;

    Task.find = function (filter = {}) {
      let filtered = mockTasks.filter((t) => {
        if (filter.isDeleted !== undefined && t.isDeleted !== filter.isDeleted) return false;
        if (filter.branch && t.branch !== filter.branch) return false;
        if (filter.assignedTo && String(t.assignedTo) !== String(filter.assignedTo)) return false;
        if (filter.status && t.status !== filter.status) return false;
        if (filter.priority && t.priority !== filter.priority) return false;
        if (filter.taskType && t.taskType !== filter.taskType) return false;
        return true;
      });

      const chain = {
        sort: () => chain,
        skip: () => chain,
        limit: (lim) => {
          filtered = filtered.slice(0, lim);
          return chain;
        },
        select: () => chain,
        lean: async () => filtered,
      };
      return chain;
    };

    Task.countDocuments = async function (filter = {}) {
      return mockTasks.filter((t) => {
        if (filter.isDeleted !== undefined && t.isDeleted !== filter.isDeleted) return false;
        if (filter.branch && t.branch !== filter.branch) return false;
        if (filter.assignedTo && String(t.assignedTo) !== String(filter.assignedTo)) return false;
        return true;
      }).length;
    };

    Task.findOne = function (filter = {}) {
      const match = mockTasks.find((t) => {
        if (filter._id && String(t._id) !== String(filter._id)) return false;
        if (filter.isDeleted !== undefined && t.isDeleted !== filter.isDeleted) return false;
        return true;
      });
      return {
        lean: async () => match || null,
        then: (resolve) => resolve(match || null),
      };
    };

    Task.create = async function (data) {
      return {
        _id: new mongoose.Types.ObjectId(),
        ...data,
        status: TASK_STATUSES.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    };

    User.findById = function () {
      return {
        select: () => ({
          lean: async () => ({ _id: sampleStaffId, name: 'Anita Rao', branch: BRANCHES.BENGALURU }),
        }),
      };
    };
  });

  afterEach(() => {
    Task.find = origTaskFind;
    Task.findOne = origTaskFindOne;
    Task.create = origTaskCreate;
    Task.countDocuments = origTaskCount;
    User.findById = origUserFindById;
  });

  test('47.1.1: validateCreateTask rejects missing title and missing candidateName', async () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      user: { _id: sampleStaffId, role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
      body: {
        title: '',
        candidateName: '',
        dueDate: new Date().toISOString(),
      },
    });

    const result = await invokeHandler(createTask, req, res);
    assert.equal(result.nextCalled, true);
    assert.equal(result.nextError?.statusCode, 400);
    assert.match(result.nextError?.message, /Task title is required/);
  });

  test('47.1.2: createTask enforces branch containment for non-super-admin staff', async () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      user: { _id: sampleStaffId, role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
      body: {
        title: 'New Student Orientation',
        candidateName: 'Vikram Joshi',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        branch: BRANCHES.MYSURU, // Attemping to assign outside counsellor's branch
        taskType: TASK_TYPES.COUNSELLING_SCHEDULED,
      },
    });

    const result = await invokeHandler(createTask, req, res);
    assert.equal(result.nextCalled, false);
    assert.equal(res.statusCode, 201);
    const body = res.body?.data || res.body;
    // Branch must be forced to user's assigned branch
    assert.equal(body.branch, BRANCHES.BENGALURU);
  });

  test('47.1.3: getTasks isolates tasks to counsellor branch and assigned identity', async () => {
    const { req, res } = mockReqRes({
      method: 'GET',
      user: { _id: sampleStaffId, role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
      branchScope: BRANCHES.BENGALURU,
      query: {},
    });

    const result = await invokeHandler(getTasks, req, res);
    assert.equal(result.nextCalled, false);
    assert.equal(res.statusCode, 200);
    const body = res.body?.data || res.body;
    assert.ok(Array.isArray(body.tasks));
    // All returned tasks must belong to Bengaluru and assigned to this counsellor
    body.tasks.forEach((t) => {
      assert.equal(t.branch, BRANCHES.BENGALURU);
      assert.equal(String(t.assignedTo), String(sampleStaffId));
    });
  });

  test('47.1.4: getDailyQueue organizes tasks into overdue, dueToday, upcoming with daily stats', async () => {
    const { req, res } = mockReqRes({
      method: 'GET',
      user: { _id: sampleStaffId, role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
      branchScope: BRANCHES.BENGALURU,
      query: {},
    });

    const result = await invokeHandler(getDailyQueue, req, res);
    assert.equal(result.nextCalled, false);
    assert.equal(res.statusCode, 200);
    const body = res.body?.data || res.body;
    assert.ok(body.queue);
    assert.ok(Array.isArray(body.queue.overdue));
    assert.ok(Array.isArray(body.queue.dueToday));
    assert.ok(body.stats);
    assert.equal(body.stats.dailyTarget, 25);
  });

  test('47.1.5: logReachout updates smartReachout metadata and increments reachoutCount', async () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      user: { _id: sampleStaffId, name: 'Anita Rao', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
      branchScope: BRANCHES.BENGALURU,
      params: { id: String(sampleTaskId) },
      body: {
        channel: REACHOUT_CHANNELS.WHATSAPP,
        outcomeCode: DISPOSITION_OUTCOMES.CALLBACK_REQUESTED,
        notes: 'Candidate requested call at 4pm after lectures',
        nextFollowupHours: 4,
      },
    });

    const result = await invokeHandler(logReachout, req, res);
    assert.equal(result.nextCalled, false);
    assert.equal(res.statusCode, 200);
    const body = res.body?.data || res.body;
    assert.equal(body.smartReachout.lastChannelUsed, REACHOUT_CHANNELS.WHATSAPP);
    assert.equal(body.smartReachout.latestOutcome, DISPOSITION_OUTCOMES.CALLBACK_REQUESTED);
    assert.ok(body.smartReachout.reachoutCount >= 2);
  });

  test('47.1.6: completeTask rejects remarks under 5 chars and marks completed on valid input', async () => {
    // 1. Under 5 characters should be rejected
    const invalidReq = mockReqRes({
      method: 'POST',
      user: { _id: sampleStaffId, name: 'Anita Rao', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
      branchScope: BRANCHES.BENGALURU,
      params: { id: String(sampleTaskId) },
      body: {
        outcome: 'Completed',
        notes: 'done', // 4 characters
      },
    });

    const invalidResult = await invokeHandler(completeTask, invalidReq.req, invalidReq.res);
    assert.equal(invalidResult.nextCalled, true);
    assert.equal(invalidResult.nextError?.statusCode, 400);
    assert.match(invalidResult.nextError?.message, /at least 5 characters/);

    // 2. Valid input (>= 5 chars) succeeds
    const validReq = mockReqRes({
      method: 'POST',
      user: { _id: sampleStaffId, name: 'Anita Rao', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
      branchScope: BRANCHES.BENGALURU,
      params: { id: String(sampleTaskId) },
      body: {
        outcome: 'Application Submitted',
        notes: 'Verified all 6 documents and submitted via portal.',
      },
    });

    const validResult = await invokeHandler(completeTask, validReq.req, validReq.res);
    assert.equal(validResult.nextCalled, false);
    assert.equal(validReq.res.statusCode, 200);
    const body = validReq.res.body?.data || validReq.res.body;
    assert.equal(body.status, TASK_STATUSES.COMPLETED);
    assert.equal(body.completionOutcome, 'Application Submitted');
  });

  test('47.1.7: deleteTask rejects deletion by counsellor (403 Forbidden)', async () => {
    const { req, res } = mockReqRes({
      method: 'DELETE',
      user: { _id: sampleStaffId, role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
      branchScope: BRANCHES.BENGALURU,
      params: { id: String(sampleTaskId) },
    });

    const result = await invokeHandler(deleteTask, req, res);
    assert.equal(result.nextCalled, true);
    assert.equal(result.nextError?.statusCode, 403);
    assert.match(result.nextError?.message, /Only Branch Managers and Super Admins/);
  });

  test('47.1.8: cross-branch task access is rejected with HTTP 403 Forbidden', async () => {
    const { req, res } = mockReqRes({
      method: 'GET',
      user: { _id: sampleStaffId, role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
      branchScope: BRANCHES.BENGALURU, // User is Bengaluru
      params: { id: String(sampleTaskId) },
    });

    // Point sample task to Mysuru
    mockTasks[0].branch = BRANCHES.MYSURU;

    const result = await invokeHandler(getTaskById, req, res);
    assert.equal(result.nextCalled, true);
    assert.equal(result.nextError?.statusCode, 403);
    assert.match(result.nextError?.message, /Access denied: Task belongs to branch 'mysuru'/);

    // Restore
    mockTasks[0].branch = BRANCHES.BENGALURU;
  });
});
