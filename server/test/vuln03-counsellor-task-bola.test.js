const { test, describe, it, beforeEach, afterEach } = require('node:test');
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
  getTaskById,
  createTask,
  updateTask,
  logReachout,
  completeTask,
  deleteTask,
} = require('../src/modules/tasks/task.controller');
const { requireBranchAccess } = require('../src/middleware/branchMiddleware');

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
      const result = handler(req, res, next);
      if (result && typeof result.then === 'function') {
        result.then(() => resolve({ nextCalled: false, nextError: null, res })).catch(next);
      }
    } catch (syncErr) {
      next(syncErr);
    }
  });
}

describe('VULN-03: Counsellor Task Access Control & BOLA Protection Suite', () => {
  let origTaskFind;
  let origTaskFindOne;
  let origTaskCreate;
  let origTaskCount;
  let origUserFindById;

  const counsellorAId = new mongoose.Types.ObjectId();
  const counsellorBId = new mongoose.Types.ObjectId();
  const managerBlrId = new mongoose.Types.ObjectId();
  const superAdminId = new mongoose.Types.ObjectId();

  const taskAId = new mongoose.Types.ObjectId();
  const taskBId = new mongoose.Types.ObjectId();
  const taskMysuruId = new mongoose.Types.ObjectId();

  const mockTasks = [
    {
      _id: taskAId,
      title: 'Task A - Assigned to Counsellor Anita',
      description: 'Follow-up with Anita candidate',
      taskType: TASK_TYPES.CALL_FOLLOWUP,
      priority: TASK_PRIORITIES.HIGH,
      status: TASK_STATUSES.PENDING,
      dueDate: new Date(Date.now() + 86400000),
      assignedTo: counsellorAId,
      assignedToName: 'Anita Rao',
      branch: BRANCHES.BENGALURU,
      candidateName: 'Candidate A',
      candidatePhone: '+91 98451 11111',
      candidateEmail: 'candidate.a@example.com',
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
      _id: taskBId,
      title: 'Task B - Assigned to Counsellor Rahul',
      description: 'Follow-up with Rahul candidate',
      taskType: TASK_TYPES.COUNSELLING_SCHEDULED,
      priority: TASK_PRIORITIES.MEDIUM,
      status: TASK_STATUSES.PENDING,
      dueDate: new Date(Date.now() + 86400000),
      assignedTo: counsellorBId,
      assignedToName: 'Rahul Verma',
      branch: BRANCHES.BENGALURU,
      candidateName: 'Candidate B',
      candidatePhone: '+91 98451 22222',
      candidateEmail: 'candidate.b@example.com',
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
    {
      _id: taskMysuruId,
      title: 'Task C - Mysuru Branch Task',
      description: 'Mysuru lead outreach',
      taskType: TASK_TYPES.DOC_COLLECTION,
      priority: TASK_PRIORITIES.URGENT,
      status: TASK_STATUSES.PENDING,
      dueDate: new Date(Date.now() + 86400000),
      assignedTo: new mongoose.Types.ObjectId(),
      assignedToName: 'Pooja Hegde',
      branch: BRANCHES.MYSURU,
      candidateName: 'Candidate C',
      candidatePhone: '+91 98451 33333',
      candidateEmail: 'candidate.c@example.com',
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

    User.findById = function (id) {
      return {
        select: () => ({
          lean: async () => {
            if (String(id) === String(counsellorAId)) {
              return { _id: counsellorAId, name: 'Anita Rao', branch: BRANCHES.BENGALURU };
            }
            if (String(id) === String(counsellorBId)) {
              return { _id: counsellorBId, name: 'Rahul Verma', branch: BRANCHES.BENGALURU };
            }
            return null;
          },
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

  describe('1. Counsellor Task List Scoping (getTasks)', () => {
    it('returns only tasks assigned to the calling counsellor', async () => {
      const { req, res } = mockReqRes({
        user: { _id: counsellorAId, role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
        query: {},
      });

      const result = await invokeHandler(getTasks, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);
      const data = res.body?.data || res.body;
      assert.equal(data.tasks.length, 1);
      assert.equal(String(data.tasks[0]._id), String(taskAId));
      assert.equal(String(data.tasks[0].assignedTo), String(counsellorAId));
    });

    it('strictly rejects counsellor requesting scope=branch with HTTP 403', async () => {
      const { req, res } = mockReqRes({
        user: { _id: counsellorAId, role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
        query: { scope: 'branch' },
      });

      const result = await invokeHandler(getTasks, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError?.statusCode, 403);
      assert.match(result.nextError?.message, /Counsellors are not authorized to view branch-wide tasks/);
    });

    it('strictly rejects counsellor attempting to filter by another staff member assignedTo ID', async () => {
      const { req, res } = mockReqRes({
        user: { _id: counsellorAId, role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
        query: { assignedTo: String(counsellorBId) },
      });

      const result = await invokeHandler(getTasks, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError?.statusCode, 403);
      assert.match(result.nextError?.message, /Counsellors can only view tasks assigned to their own user ID/);
    });
  });

  describe('2. BOLA / IDOR Single Task Access (getTaskById)', () => {
    it('allows counsellor to retrieve their own assigned task by ID', async () => {
      const { req, res } = mockReqRes({
        user: { _id: counsellorAId, role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
        params: { id: String(taskAId) },
      });

      const result = await invokeHandler(getTaskById, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);
      const data = res.body?.data || res.body;
      assert.equal(String(data._id), String(taskAId));
    });

    it('strictly denies counsellor accessing another counsellor task by ID (BOLA prevention)', async () => {
      const { req, res } = mockReqRes({
        user: { _id: counsellorAId, role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
        params: { id: String(taskBId) }, // Task B belongs to Rahul
      });

      const result = await invokeHandler(getTaskById, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError?.statusCode, 403);
      assert.match(result.nextError?.message, /You are only authorized to view tasks assigned to your own user ID/);
    });
  });

  describe('3. Branch Manager Task Access Scope', () => {
    it('allows Branch Manager to access all tasks in their assigned branch', async () => {
      const { req, res } = mockReqRes({
        user: { _id: managerBlrId, role: ROLES.BRANCH_MANAGER, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
        query: {},
      });

      const result = await invokeHandler(getTasks, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);
      const data = res.body?.data || res.body;
      // Both Task A and Task B belong to Bengaluru
      assert.equal(data.tasks.length, 2);
    });

    it('allows Branch Manager to filter by specific staff assignedTo in their branch', async () => {
      const { req, res } = mockReqRes({
        user: { _id: managerBlrId, role: ROLES.BRANCH_MANAGER, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
        query: { assignedTo: String(counsellorBId) },
      });

      const result = await invokeHandler(getTasks, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);
      const data = res.body?.data || res.body;
      assert.equal(data.tasks.length, 1);
      assert.equal(String(data.tasks[0].assignedTo), String(counsellorBId));
    });

    it('allows Branch Manager to retrieve any task in their branch by ID', async () => {
      const { req, res } = mockReqRes({
        user: { _id: managerBlrId, role: ROLES.BRANCH_MANAGER, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
        params: { id: String(taskBId) },
      });

      const result = await invokeHandler(getTaskById, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);
      const data = res.body?.data || res.body;
      assert.equal(String(data._id), String(taskBId));
    });

    it('denies Branch Manager access to tasks belonging to another branch', async () => {
      const { req, res } = mockReqRes({
        user: { _id: managerBlrId, role: ROLES.BRANCH_MANAGER, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
        params: { id: String(taskMysuruId) }, // Task in Mysuru
      });

      const result = await invokeHandler(getTaskById, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError?.statusCode, 403);
      assert.match(result.nextError?.message, /Access denied: Task belongs to branch 'mysuru'/);
    });
  });

  describe('4. Super Admin Global Cross-Branch Access', () => {
    it('allows Super Admin to view tasks across all branches', async () => {
      const { req, res } = mockReqRes({
        user: { _id: superAdminId, role: ROLES.SUPER_ADMIN, branch: BRANCHES.ALL },
        branchScope: 'all',
        query: {},
      });

      const result = await invokeHandler(getTasks, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);
      const data = res.body?.data || res.body;
      assert.equal(data.tasks.length, 3);
    });

    it('allows Super Admin to filter tasks by any specific branch', async () => {
      const { req, res } = mockReqRes({
        user: { _id: superAdminId, role: ROLES.SUPER_ADMIN, branch: BRANCHES.ALL },
        branchScope: 'all',
        query: { branch: BRANCHES.MYSURU },
      });

      const result = await invokeHandler(getTasks, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);
      const data = res.body?.data || res.body;
      assert.equal(data.tasks.length, 1);
      assert.equal(data.tasks[0].branch, BRANCHES.MYSURU);
    });
  });

  describe('5. Task Modification BOLA & RBAC Controls', () => {
    it('denies counsellor updating another counsellor task (BOLA prevention)', async () => {
      const { req, res } = mockReqRes({
        user: { _id: counsellorAId, role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
        params: { id: String(taskBId) },
        body: { title: 'Unauthorized Modification' },
      });

      const result = await invokeHandler(updateTask, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError?.statusCode, 403);
      assert.match(result.nextError?.message, /You can only update tasks assigned to your own user ID/);
    });

    it('denies counsellor logging reach-outs on another counsellor task', async () => {
      const { req, res } = mockReqRes({
        user: { _id: counsellorAId, role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
        params: { id: String(taskBId) },
        body: {
          channel: REACHOUT_CHANNELS.CALL,
          outcomeCode: DISPOSITION_OUTCOMES.CONNECTED_INTERESTED,
          notes: 'Unauthorized call log',
        },
      });

      const result = await invokeHandler(logReachout, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError?.statusCode, 403);
      assert.match(result.nextError?.message, /You can only log reach-outs for tasks assigned to your own user ID/);
    });

    it('denies counsellor completing another counsellor task', async () => {
      const { req, res } = mockReqRes({
        user: { _id: counsellorAId, role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
        params: { id: String(taskBId) },
        body: {
          outcome: 'Completed by unauthorized peer',
          notes: 'Should be rejected',
        },
      });

      const result = await invokeHandler(completeTask, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError?.statusCode, 403);
      assert.match(result.nextError?.message, /You can only complete tasks assigned to your own user ID/);
    });

    it('denies counsellor assigning newly created task to another staff member', async () => {
      const { req, res } = mockReqRes({
        user: { _id: counsellorAId, role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        body: {
          title: 'Delegation Attempt',
          candidateName: 'Test Student',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          assignedTo: String(counsellorBId), // Attempting to assign to Rahul
        },
      });

      const result = await invokeHandler(createTask, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError?.statusCode, 403);
      assert.match(result.nextError?.message, /Counsellors cannot assign tasks to other staff members/);
    });

    it('strictly denies counsellor from deleting tasks', async () => {
      const { req, res } = mockReqRes({
        user: { _id: counsellorAId, role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
        params: { id: String(taskAId) },
      });

      const result = await invokeHandler(deleteTask, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError?.statusCode, 403);
      assert.match(result.nextError?.message, /Only Branch Managers and Super Admins can delete tasks/);
    });

    it('allows Branch Manager to delete tasks in their assigned branch', async () => {
      const { req, res } = mockReqRes({
        user: { _id: managerBlrId, role: ROLES.BRANCH_MANAGER, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
        params: { id: String(taskAId) },
      });

      const result = await invokeHandler(deleteTask, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);
      const data = res.body?.data || res.body;
      assert.match(data.message, /Task deleted successfully/);
    });
  });

  describe('6. Branch Authorization Middleware Fail-Closed Protection', () => {
    const branchMiddleware = requireBranchAccess();

    it('fails closed when user has missing or empty branch assignment', async () => {
      const { req, res } = mockReqRes({
        user: { _id: counsellorAId, role: ROLES.COUNSELLOR, branch: null },
      });

      const result = await invokeHandler(branchMiddleware, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError?.statusCode, 403);
      assert.match(result.nextError?.message, /User account has no assigned branch/);
    });

    it('fails closed when non-super-admin attempts to request another branch', async () => {
      const { req, res } = mockReqRes({
        user: { _id: counsellorAId, role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        query: { branch: BRANCHES.MYSURU },
      });

      const result = await invokeHandler(branchMiddleware, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError?.statusCode, 403);
      assert.match(result.nextError?.message, /Branch access denied/);
    });

    it('fails closed when non-super-admin attempts to request branch=all', async () => {
      const { req, res } = mockReqRes({
        user: { _id: counsellorAId, role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        query: { branch: 'all' },
      });

      const result = await invokeHandler(branchMiddleware, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError?.statusCode, 403);
      assert.match(result.nextError?.message, /Branch access denied/);
    });

    it('permits Super Admin to request any branch or branch=all', async () => {
      const { req, res } = mockReqRes({
        user: { _id: superAdminId, role: ROLES.SUPER_ADMIN, branch: BRANCHES.ALL },
        query: { branch: BRANCHES.MYSURU },
      });

      const result = await invokeHandler(branchMiddleware, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError, null);
      assert.equal(req.branchScope, BRANCHES.MYSURU);
    });
  });
});
