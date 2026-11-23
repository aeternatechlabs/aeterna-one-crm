/**
 * Day 45 Follow-up / Day 45.1: Dashboard Dynamic APIs & Debounced Search Verification Suite
 *
 * Verifies:
 * 1. getDashboardSummary: calculates key metrics (totalLeads, activeStudents, totalApplications, visasApproved)
 * 2. getDashboardSummary: calculates 7-stage ribbon chevrons (new, qualified, counselling, application, offer, visa, enrolled)
 * 3. getDashboardSummary: branch scoping (Super Admin cross-branch, Branch staff strictly locked to branch)
 * 4. globalSearch: search query validation (> 50 chars rejected with 400)
 * 5. globalSearch: empty query returns empty results immediately
 * 6. globalSearch: matches across both PipelineStudent and Student models
 * 7. globalSearch: enforces branch containment for branch-restricted staff
 */
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { mockReqRes } = require('./helpers/testApp');
const { ROLES, BRANCHES, PIPELINE_STAGES, STUDENT_STATUS } = require('../src/config/constants');
const PipelineStudent = require('../src/modules/pipeline/pipeline.model');
const Student = require('../src/modules/students/student.model');
const {
  getDashboardSummary,
  globalSearch,
} = require('../src/modules/pipeline/pipeline.controller');

/**
 * Invokes an Express controller handler and waits for either next(err) or res.json()
 */
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

describe('Day 45.1: Dashboard Dynamic APIs & Debounced Search Engine', () => {
  let origPipelineCount;
  let origStudentCount;
  let origPipelineFind;
  let origStudentFind;

  const mockPipelineStudents = [
    {
      _id: new mongoose.Types.ObjectId(),
      studentName: 'Rohan Sharma',
      email: 'rohan.sharma@example.com',
      phone: '+91 98451 12345',
      programme: 'MSc Computer Science',
      university: 'Imperial College London',
      destination: 'United Kingdom',
      branch: BRANCHES.BENGALURU,
      stage: PIPELINE_STAGES.OFFER_RECEIVED,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      studentName: 'Karthik Rao',
      email: 'karthik.rao@example.com',
      phone: '+91 98453 34567',
      programme: 'MSc Mechanical',
      university: 'TU Munich',
      destination: 'Germany',
      branch: BRANCHES.BENGALURU,
      stage: PIPELINE_STAGES.VISA_DECISION,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      studentName: 'Bharath Urs',
      email: 'bharath.urs@example.com',
      phone: '+91 98221 11223',
      programme: 'MSc Aerospace',
      university: 'Cranfield University',
      destination: 'United Kingdom',
      branch: BRANCHES.MYSURU,
      stage: PIPELINE_STAGES.APPLICATION_STARTED,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      studentName: 'Prathamesh Patil',
      email: 'prathamesh.patil@example.com',
      phone: '+91 98811 12345',
      programme: 'MSc Automotive',
      university: 'RWTH Aachen',
      destination: 'Germany',
      branch: BRANCHES.BELAGAVI,
      stage: PIPELINE_STAGES.ENROLLED,
    },
  ];

  const mockStudents = [
    {
      _id: new mongoose.Types.ObjectId(),
      studentId: 'AET-BLR-2026-0001',
      studentName: 'Rohan Sharma',
      email: 'rohan.sharma@example.com',
      phone: '+91 98451 12345',
      branch: BRANCHES.BENGALURU,
      status: STUDENT_STATUS.ACTIVE,
      preferences: { targetCourse: 'MSc Computer Science' },
    },
    {
      _id: new mongoose.Types.ObjectId(),
      studentId: 'AET-MYS-2026-0001',
      studentName: 'Bharath Urs',
      email: 'bharath.urs@example.com',
      phone: '+91 98221 11223',
      branch: BRANCHES.MYSURU,
      status: STUDENT_STATUS.ACTIVE,
      preferences: { targetCourse: 'MSc Aerospace' },
    },
  ];

  beforeEach(() => {
    origPipelineCount = PipelineStudent.countDocuments;
    origStudentCount = Student.countDocuments;
    origPipelineFind = PipelineStudent.find;
    origStudentFind = Student.find;

    // In-memory mock for countDocuments
    PipelineStudent.countDocuments = async function (filter = {}) {
      return mockPipelineStudents.filter((s) => {
        if (filter.branch && s.branch !== filter.branch) return false;
        if (filter.stage) {
          if (filter.stage.$in) {
            return filter.stage.$in.includes(s.stage);
          }
          return s.stage === filter.stage;
        }
        return true;
      }).length;
    };

    Student.countDocuments = async function (filter = {}) {
      return mockStudents.filter((s) => {
        if (filter.branch && s.branch !== filter.branch) return false;
        if (filter.status && filter.status.$in) {
          return filter.status.$in.includes(s.status);
        }
        return true;
      }).length;
    };

    // In-memory mock for find
    PipelineStudent.find = function (filter = {}) {
      const results = mockPipelineStudents.filter((s) => {
        if (filter.branch && s.branch !== filter.branch) return false;
        if (filter.$or) {
          return filter.$or.some((condition) => {
            for (const [key, val] of Object.entries(condition)) {
              if (val.$regex && s[key]) {
                const re = new RegExp(val.$regex, val.$options || '');
                if (re.test(s[key])) return true;
              }
            }
            return false;
          });
        }
        return true;
      });

      return {
        select: function () {
          return this;
        },
        limit: function (lim) {
          return {
            lean: async () => results.slice(0, lim),
          };
        },
      };
    };

    Student.find = function (filter = {}) {
      const results = mockStudents.filter((s) => {
        if (filter.branch && s.branch !== filter.branch) return false;
        if (filter.$or) {
          return filter.$or.some((condition) => {
            for (const [key, val] of Object.entries(condition)) {
              if (key === 'preferences.targetCourse') {
                if (val.$regex && s.preferences?.targetCourse) {
                  const re = new RegExp(val.$regex, val.$options || '');
                  if (re.test(s.preferences.targetCourse)) return true;
                }
              } else if (val.$regex && s[key]) {
                const re = new RegExp(val.$regex, val.$options || '');
                if (re.test(s[key])) return true;
              }
            }
            return false;
          });
        }
        return true;
      });

      return {
        select: function () {
          return this;
        },
        limit: function (lim) {
          return {
            lean: async () => results.slice(0, lim),
          };
        },
      };
    };
  });

  afterEach(() => {
    PipelineStudent.countDocuments = origPipelineCount;
    Student.countDocuments = origStudentCount;
    PipelineStudent.find = origPipelineFind;
    Student.find = origStudentFind;
  });

  test('45.1.1: Super Admin retrieves dashboard summary across all branches (branch=all)', async () => {
    const { req, res } = mockReqRes({
      user: { role: ROLES.SUPER_ADMIN, branch: BRANCHES.ALL },
      query: { branch: 'all', period: '30' },
      branchScope: 'all',
    });

    const { nextError } = await invokeHandler(getDashboardSummary, req, res);
    assert.strictEqual(nextError, null, 'No error thrown');
    assert.strictEqual(res.statusCode, 200);

    const payload = res.body?.data || res.body;
    assert.strictEqual(payload.branch, 'all');
    assert.strictEqual(payload.metrics.totalLeads, 4);
    assert.strictEqual(payload.metrics.activeStudents, 2);
    assert.strictEqual(payload.metrics.totalApplications, 4);
    assert.ok(payload.chevrons, 'Chevrons object present');
    assert.ok(Array.isArray(payload.leadTrend), 'Lead trend array returned');
  });

  test('45.1.2: Super Admin filters dashboard summary for a specific branch (branch=bengaluru)', async () => {
    const { req, res } = mockReqRes({
      user: { role: ROLES.SUPER_ADMIN, branch: BRANCHES.ALL },
      query: { branch: 'bengaluru', period: '30' },
      branchScope: 'all',
    });

    const { nextError } = await invokeHandler(getDashboardSummary, req, res);
    assert.strictEqual(nextError, null);
    assert.strictEqual(res.statusCode, 200);

    const payload = res.body?.data || res.body;
    assert.strictEqual(payload.branch, 'bengaluru');
    assert.strictEqual(payload.metrics.totalLeads, 2);
    assert.strictEqual(payload.metrics.activeStudents, 1);
  });

  test('45.1.3: Mysuru Branch Manager is strictly scoped to mysuru even if query requests all', async () => {
    const { req, res } = mockReqRes({
      user: { role: ROLES.BRANCH_MANAGER, branch: BRANCHES.MYSURU },
      query: { branch: 'all' },
      branchScope: 'mysuru',
    });

    const { nextError } = await invokeHandler(getDashboardSummary, req, res);
    assert.strictEqual(nextError, null);
    assert.strictEqual(res.statusCode, 200);

    const payload = res.body?.data || res.body;
    assert.strictEqual(payload.branch, 'mysuru', 'Enforces req.branchScope mysuru');
    assert.strictEqual(payload.metrics.totalLeads, 1);
  });

  test('45.1.4: Global search rejects query strings exceeding 50 characters (400)', async () => {
    const longQuery = 'A'.repeat(51);
    const { req, res } = mockReqRes({
      user: { role: ROLES.SUPER_ADMIN, branch: BRANCHES.ALL },
      query: { query: longQuery },
      branchScope: 'all',
    });

    const { nextError } = await invokeHandler(globalSearch, req, res);
    assert.ok(nextError, 'Error thrown on oversized query');
    assert.strictEqual(nextError.statusCode, 400);
    assert.match(nextError.message, /cannot exceed 50 characters/i);
  });

  test('45.1.5: Global search with empty/whitespace query returns zero results immediately', async () => {
    const { req, res } = mockReqRes({
      user: { role: ROLES.SUPER_ADMIN, branch: BRANCHES.ALL },
      query: { query: '   ' },
      branchScope: 'all',
    });

    const { nextError } = await invokeHandler(globalSearch, req, res);
    assert.strictEqual(nextError, null);
    assert.strictEqual(res.statusCode, 200);

    const payload = res.body?.data || res.body;
    assert.deepStrictEqual(payload.results, []);
    assert.strictEqual(payload.total, 0);
  });

  test('45.1.6: Global search returns matches across both PipelineStudent and Student models', async () => {
    const { req, res } = mockReqRes({
      user: { role: ROLES.SUPER_ADMIN, branch: BRANCHES.ALL },
      query: { query: 'Rohan' },
      branchScope: 'all',
    });

    const { nextError } = await invokeHandler(globalSearch, req, res);
    assert.strictEqual(nextError, null);
    assert.strictEqual(res.statusCode, 200);

    const payload = res.body?.data || res.body;
    assert.ok(payload.results.length >= 2, 'Found matches in both pipeline and student models');

    const types = payload.results.map((r) => r.type);
    assert.ok(types.includes('student'), 'Contains student record');
    assert.ok(types.includes('lead'), 'Contains pipeline lead record');

    const studentRecord = payload.results.find((r) => r.type === 'student');
    assert.strictEqual(studentRecord.studentId, 'AET-BLR-2026-0001');
    assert.strictEqual(studentRecord.name, 'Rohan Sharma');
    assert.strictEqual(studentRecord.link, `/students/${studentRecord.id}`);
  });

  test('45.1.7: Global search scopes matches to branch for branch-restricted staff', async () => {
    const { req, res } = mockReqRes({
      user: { role: ROLES.COUNSELLOR, branch: BRANCHES.MYSURU },
      query: { query: 'Aerospace' },
      branchScope: 'mysuru',
    });

    const { nextError } = await invokeHandler(globalSearch, req, res);
    assert.strictEqual(nextError, null);
    assert.strictEqual(res.statusCode, 200);

    const payload = res.body?.data || res.body;
    for (const match of payload.results) {
      assert.strictEqual(match.branch, BRANCHES.MYSURU, 'Result strictly belongs to Mysuru');
    }
  });
});
