const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const {
  ROLES,
  BRANCHES,
} = require('../src/config/constants');
const {
  KPI_DEFINITIONS,
  REPORTING_PERIODS,
  getDateRange,
} = require('../src/modules/reports/kpiDictionary');
const PipelineStudent = require('../src/modules/pipeline/pipeline.model');
const Student = require('../src/modules/students/student.model');
const Task = require('../src/modules/tasks/task.model');
const reportsService = require('../src/modules/reports/reports.service');
const reportsController = require('../src/modules/reports/reports.controller');

describe('Day 75: Phase B5 Independent Verification & Release Gate', () => {
  let origPipelineCount;
  let origPipelineAggregate;
  let origStudentCount;
  let origTaskCount;
  let origTaskAggregate;

  beforeEach(() => {
    origPipelineCount = PipelineStudent.countDocuments;
    origPipelineAggregate = PipelineStudent.aggregate;
    origStudentCount = Student.countDocuments;
    origTaskCount = Task.countDocuments;
    origTaskAggregate = Task.aggregate;

    // Deterministic Mocks for In-Memory Performance Testing
    PipelineStudent.countDocuments = async (filter = {}) => {
      if (filter.branch === BRANCHES.MYSURU) return 40;
      if (filter.branch === BRANCHES.BELAGAVI) return 25;
      return 120;
    };

    PipelineStudent.aggregate = async (pipeline = []) => {
      // Determine what pipeline is grouping by
      const groupStage = pipeline.find((p) => p.$group);
      if (!groupStage) return [];

      const groupExpr = JSON.stringify(groupStage.$group._id);

      if (groupExpr.includes('$stage')) {
        return [
          { _id: 'new', count: 40 },
          { _id: 'qualified', count: 25 },
          { _id: 'submitted', count: 18 },
          { _id: 'visa_approved', count: 12 },
          { _id: 'enrolled', count: 10 },
        ];
      }

      if (groupExpr.includes('preferredDestination') && groupExpr.includes('intakeTerm')) {
        return [
          { _id: { destination: 'UK', intake: 'Fall 2026' }, count: 42 },
          { _id: { destination: 'Canada', intake: 'Spring 2027' }, count: 28 },
          { _id: { destination: 'USA', intake: 'Fall 2026' }, count: 20 },
        ];
      }

      if (groupExpr.includes('preferredDestination')) {
        return [
          { _id: 'United Kingdom', count: 55 },
          { _id: 'Canada', count: 35 },
          { _id: 'Australia', count: 20 },
        ];
      }

      if (groupExpr.includes('source')) {
        return [
          { _id: 'Google Search', count: 45 },
          { _id: 'Instagram Lead Ad', count: 35 },
          { _id: 'Referral / Alumni', count: 25 },
        ];
      }

      if (groupExpr.includes('$dateToString')) {
        return [
          { _id: '2026-11-01', count: 6 },
          { _id: '2026-11-02', count: 9 },
          { _id: '2026-11-03', count: 14 },
        ];
      }

      return [];
    };

    Student.countDocuments = async (filter = {}) => {
      if (filter.branch === BRANCHES.MYSURU) return 15;
      if (filter.branch === BRANCHES.BELAGAVI) return 8;
      return 45;
    };

    Task.countDocuments = async (filter = {}) => {
      if (filter.$expr) return 76; // SLA compliant count
      return 80; // Total completed tasks
    };

    Task.aggregate = async () => {
      return [
        {
          _id: 'counsellor_blr_1',
          counsellorName: 'Priya Nair',
          branch: BRANCHES.BENGALURU,
          tasksCompleted: 48,
          reachoutsCompleted: 130,
        },
        {
          _id: 'counsellor_mys_1',
          counsellorName: 'Kavitha Rao',
          branch: BRANCHES.MYSURU,
          tasksCompleted: 35,
          reachoutsCompleted: 95,
        },
      ];
    };
  });

  afterEach(() => {
    PipelineStudent.countDocuments = origPipelineCount;
    PipelineStudent.aggregate = origPipelineAggregate;
    Student.countDocuments = origStudentCount;
    Task.countDocuments = origTaskCount;
    Task.aggregate = origTaskAggregate;
  });

  test('75.1.1: KPI Dictionary defines valid numerators, denominators, and target criteria', () => {
    assert.ok(KPI_DEFINITIONS.LEAD_VOLUME);
    assert.ok(KPI_DEFINITIONS.STAGE_CONVERSION_RATE);
    assert.ok(KPI_DEFINITIONS.APPLICATION_TO_OFFER);
    assert.ok(KPI_DEFINITIONS.VISA_SUCCESS_RATE);
    assert.equal(KPI_DEFINITIONS.COUNSELLOR_VELOCITY.target, 25);
    assert.equal(KPI_DEFINITIONS.COUNSELLOR_VELOCITY.unit, 'reachouts/day');
    assert.ok(KPI_DEFINITIONS.SLA_COMPLIANCE_RATE);
  });

  test('75.1.2: getDateRange handles periods (7, 30, 90, ytd) and computes exact day counts', () => {
    const fixedNow = new Date('2026-11-20T12:00:00.000Z');

    const range7 = getDateRange('7', fixedNow);
    assert.equal(range7.daysCount, 7);
    assert.equal(range7.periodLabel, 'Last 7 Days');

    const range30 = getDateRange('30', fixedNow);
    assert.equal(range30.daysCount, 30);
    assert.equal(range30.periodLabel, 'Last 30 Days');

    const range90 = getDateRange('90', fixedNow);
    assert.equal(range90.daysCount, 90);
    assert.equal(range90.periodLabel, 'Last 90 Days');

    const rangeYtd = getDateRange('ytd', fixedNow);
    assert.ok(rangeYtd.daysCount > 300);
    assert.equal(rangeYtd.startDate.getMonth(), 0); // Jan 1st
    assert.equal(rangeYtd.startDate.getDate(), 1);
  });

  test('75.1.3: getExecutiveOverview returns structured metrics, destination share, and trend series', async () => {
    const overview = await reportsService.getExecutiveOverview('all', '30');

    assert.ok(overview);
    assert.ok(overview.metrics);
    assert.equal(overview.metrics.totalLeads, 120);
    assert.equal(overview.metrics.activeStudents, 45);
    assert.equal(overview.metrics.visasApproved, 22);
    assert.equal(overview.metrics.enrolledCount, 10);
    assert.equal(overview.metrics.overallConversionRate, 8.3);
    assert.equal(overview.leadsByDestination.length, 3);
    assert.equal(overview.leadsByDestination[0].country, 'United Kingdom');
    assert.equal(overview.leadsBySource.length, 3);
    assert.equal(overview.trendSeries.length, 3);
  });

  test('75.1.4: getBranchScorecards computes targets, actual leads, conversion rates, and SLA compliance', async () => {
    const scorecards = await reportsService.getBranchScorecards('all', ROLES.SUPER_ADMIN, '30');

    assert.ok(scorecards);
    assert.ok(Array.isArray(scorecards.branches));
    assert.equal(scorecards.branches.length, 3); // Bengaluru, Mysuru, Belagavi

    const blr = scorecards.branches.find((b) => b.branchId === BRANCHES.BENGALURU);
    assert.ok(blr);
    assert.equal(blr.branchName, 'Bengaluru (HQ)');
    assert.equal(blr.metrics.targetLeads, 150);
    assert.equal(blr.metrics.totalLeads, 120);
    assert.equal(blr.metrics.targetAchieved, 80);
    assert.equal(blr.metrics.slaComplianceRate, 95);
    assert.ok(scorecards.consolidated);
  });

  test('75.1.5: Branch isolation: Branch Manager is restricted from querying unauthorized cross-branch scorecards', async () => {
    const scorecards = await reportsService.getBranchScorecards(BRANCHES.MYSURU, ROLES.BRANCH_MANAGER, '30');

    assert.ok(scorecards);
    assert.equal(scorecards.branches.length, 1);
    assert.equal(scorecards.branches[0].branchId, BRANCHES.MYSURU);
    assert.equal(scorecards.branches[0].branchName, 'Mysuru');
    assert.equal(scorecards.branches[0].metrics.totalLeads, 40);
  });

  test('75.1.6: 16-Stage Admissions Funnel calculates cumulative progression and drop-off percentages', async () => {
    const funnel = await reportsService.getConversionFunnel('all', '30');

    assert.ok(funnel);
    assert.ok(Array.isArray(funnel.funnelSteps));
    assert.equal(funnel.funnelSteps.length, 16);

    assert.equal(funnel.funnelSteps[0].stageKey, 'new');
    assert.equal(funnel.funnelSteps[0].stageIndex, 1);
    assert.equal(funnel.funnelSteps[15].stageKey, 'enrolled');
    assert.equal(funnel.funnelSteps[15].stageIndex, 16);

    for (const step of funnel.funnelSteps) {
      assert.ok(step.conversionRate >= 0 && step.conversionRate <= 100);
      assert.ok(step.dropoffRate >= 0 && step.dropoffRate <= 100);
    }
  });

  test('75.1.7: Counsellor performance calculates daily outreach velocity against 25/day target (excluding Sundays)', async () => {
    const performance = await reportsService.getCounsellorPerformance('all', '30');

    assert.ok(performance);
    assert.ok(performance.period);
    assert.equal(performance.period.workingDays, 26);
    assert.equal(performance.counsellors.length, 2);

    const priya = performance.counsellors[0];
    assert.equal(priya.counsellorName, 'Priya Nair');
    assert.equal(priya.tasksCompleted, 48);
    assert.equal(priya.reachoutsCompleted, 130);
    assert.equal(priya.dailyVelocity, 5); // 130 / 26 = 5.0
    assert.equal(priya.dailyTarget, 25);
    assert.equal(priya.velocityEfficiency, 20); // (5 / 25) * 100
  });

  test('75.1.8: Intake trends forecasts enrolment projections (~18%) by destination and intake season', async () => {
    const intake = await reportsService.getIntakeTrends('all');

    assert.ok(intake);
    assert.ok(Array.isArray(intake.trends));
    assert.equal(intake.trends.length, 3);
    assert.equal(intake.trends[0].destination, 'UK');
    assert.equal(intake.trends[0].intake, 'Fall 2026');
    assert.equal(intake.trends[0].enquiries, 42);
    assert.equal(intake.trends[0].forecastEnrolled, 8); // Math.round(42 * 0.18)
  });

  test('75.1.9: Controller resolveSafeBranch guarantees branch restriction for non-super-admin', async () => {
    const reqMock = {
      user: {
        role: ROLES.BRANCH_MANAGER,
        branch: BRANCHES.BELAGAVI,
      },
      query: {
        branch: 'all',
        period: '30',
      },
    };

    let responseData = null;
    let statusCode = 200;
    const resMock = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            responseData = data;
          },
        };
      },
    };

    await reportsController.getBranchScorecards(reqMock, resMock, (err) => {
      assert.fail(`Controller threw error: ${err.message}`);
    });

    assert.equal(statusCode, 200);
    assert.ok(responseData.success);
    assert.equal(responseData.data.branches.length, 1);
    assert.equal(responseData.data.branches[0].branchId, BRANCHES.BELAGAVI);
  });
});
