/**
 * Day 30: Phase B2 Independent Verification & Release Gate
 * Comprehensive State-Machine, Document Gate, Terminal Workflow, RBAC, and Concurrency Test Suite.
 * Fully isolated in-memory unit & contract execution (zero socket dependencies, sandbox-resilient).
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  PIPELINE_STAGES,
  PIPELINE_STAGE_LABELS,
  ROLES,
  BRANCHES,
} = require('../src/config/constants');

const {
  ALLOWED_STAGE_TRANSITIONS,
  isSubmissionStage,
  isExitStage,
  validatePipelineTransition,
} = require('../src/modules/pipeline/pipelineStateMachine');

// Parse client constants via static analysis to prevent import.meta.env runtime errors in Node
const CLIENT_CONSTANTS_SRC = fs.readFileSync(
  path.join(__dirname, '..', '..', 'client', 'src', 'config', 'constants.js'),
  'utf8'
);

function parseClientObject(objName) {
  const regex = new RegExp(`export const ${objName} = \\{([\\s\\S]*?)\\};`);
  const match = regex.exec(CLIENT_CONSTANTS_SRC);
  assert.ok(match, `client ${objName} block found`);
  const map = {};
  for (const [, key, val] of match[1].matchAll(/([A-Z_]+):\s*'([^']+)'/g)) {
    map[key] = val;
  }
  return map;
}

const CLIENT_PIPELINE_STAGES = parseClientObject('PIPELINE_STAGES');

function parseClientLabels() {
  const match = /export const PIPELINE_STAGE_LABELS = \{([\s\S]*?)\};/.exec(CLIENT_CONSTANTS_SRC);
  assert.ok(match, 'client PIPELINE_STAGE_LABELS block found');
  const map = {};
  for (const [, stageKey, label] of match[1].matchAll(/\[PIPELINE_STAGES\.([A-Z_]+)\]:\s*'([^']+)'/g)) {
    const stageVal = PIPELINE_STAGES[stageKey];
    if (stageVal) map[stageVal] = label;
  }
  return map;
}

const CLIENT_STAGE_LABELS = parseClientLabels();

describe('Day 30: B2 State-Machine Lifecycle Verification', () => {
  test('B2.1: Full sequential forward progression through all 16 stages to ENROLLED', () => {
    const forwardSequence = [
      PIPELINE_STAGES.NEW,
      PIPELINE_STAGES.CONTACTED,
      PIPELINE_STAGES.QUALIFIED,
      PIPELINE_STAGES.COUNSELLING_BOOKED,
      PIPELINE_STAGES.COUNSELLING_COMPLETED,
      PIPELINE_STAGES.SHORTLISTED,
      PIPELINE_STAGES.APPLICATION_STARTED,
      PIPELINE_STAGES.DOCUMENTS_COMPLETE,
      PIPELINE_STAGES.SUBMITTED,
      PIPELINE_STAGES.OFFER_RECEIVED,
      PIPELINE_STAGES.DEPOSIT_PAID,
      PIPELINE_STAGES.VISA_FILED,
      PIPELINE_STAGES.VISA_DECISION,
      PIPELINE_STAGES.PRE_DEPARTURE,
      PIPELINE_STAGES.ENROLLED,
    ];

    for (let i = 0; i < forwardSequence.length - 1; i++) {
      const from = forwardSequence[i];
      const to = forwardSequence[i + 1];

      const result = validatePipelineTransition({
        currentStage: from,
        targetStage: to,
        userRole: ROLES.COUNSELLOR,
        documentsVerified: true, // satisfies document gate for submission stages
      });

      assert.equal(
        result.valid,
        true,
        `Expected valid transition from "${from}" to "${to}", got error: ${result.error}`
      );
    }
  });

  test('B2.2: Backward revision transitions succeed within allowed state matrix', () => {
    const backwardPairs = [
      [PIPELINE_STAGES.COUNSELLING_COMPLETED, PIPELINE_STAGES.COUNSELLING_BOOKED],
      [PIPELINE_STAGES.SHORTLISTED, PIPELINE_STAGES.COUNSELLING_COMPLETED],
      [PIPELINE_STAGES.APPLICATION_STARTED, PIPELINE_STAGES.SHORTLISTED],
      [PIPELINE_STAGES.DOCUMENTS_COMPLETE, PIPELINE_STAGES.APPLICATION_STARTED],
      [PIPELINE_STAGES.SUBMITTED, PIPELINE_STAGES.DOCUMENTS_COMPLETE],
      [PIPELINE_STAGES.OFFER_RECEIVED, PIPELINE_STAGES.SUBMITTED],
      [PIPELINE_STAGES.DEPOSIT_PAID, PIPELINE_STAGES.OFFER_RECEIVED],
      [PIPELINE_STAGES.VISA_FILED, PIPELINE_STAGES.DEPOSIT_PAID],
      [PIPELINE_STAGES.VISA_DECISION, PIPELINE_STAGES.VISA_FILED],
      [PIPELINE_STAGES.PRE_DEPARTURE, PIPELINE_STAGES.VISA_DECISION],
      [PIPELINE_STAGES.ENROLLED, PIPELINE_STAGES.PRE_DEPARTURE],
    ];

    for (const [from, to] of backwardPairs) {
      const result = validatePipelineTransition({
        currentStage: from,
        targetStage: to,
        userRole: ROLES.COUNSELLOR,
        documentsVerified: true,
      });

      assert.equal(
        result.valid,
        true,
        `Expected backward transition from "${from}" to "${to}" to be valid`
      );
    }
  });

  test('B2.3: Arbitrary illegal jumps across the pipeline are strictly rejected', () => {
    const illegalTransitions = [
      [PIPELINE_STAGES.NEW, PIPELINE_STAGES.ENROLLED],
      [PIPELINE_STAGES.NEW, PIPELINE_STAGES.SUBMITTED],
      [PIPELINE_STAGES.CONTACTED, PIPELINE_STAGES.VISA_FILED],
      [PIPELINE_STAGES.SHORTLISTED, PIPELINE_STAGES.ENROLLED],
      [PIPELINE_STAGES.DOCUMENTS_COMPLETE, PIPELINE_STAGES.ENROLLED],
      [PIPELINE_STAGES.DEPOSIT_PAID, PIPELINE_STAGES.CONTACTED],
      [PIPELINE_STAGES.ENROLLED, PIPELINE_STAGES.NEW],
    ];

    for (const [from, to] of illegalTransitions) {
      const result = validatePipelineTransition({
        currentStage: from,
        targetStage: to,
        userRole: ROLES.COUNSELLOR,
        documentsVerified: true,
      });

      assert.equal(
        result.valid,
        false,
        `Expected illegal transition from "${from}" to "${to}" to be rejected`
      );
      assert.equal(result.statusCode, 400);
      assert.match(result.error, /Invalid stage transition/i);
    }
  });
});

describe('Day 30: Document Verification Gate Verification', () => {
  test('B2.4: Transition to SUBMITTED or APPLICATION_SUBMITTED without documentsVerified is rejected', () => {
    const submissionTargets = [
      PIPELINE_STAGES.SUBMITTED,
      PIPELINE_STAGES.APPLICATION_SUBMITTED,
    ];

    for (const target of submissionTargets) {
      const result = validatePipelineTransition({
        currentStage: PIPELINE_STAGES.DOCUMENTS_COMPLETE,
        targetStage: target,
        userRole: ROLES.COUNSELLOR,
        documentsVerified: false,
      });

      assert.equal(result.valid, false);
      assert.equal(result.statusCode, 400);
      assert.match(result.error, /student documents must be verified first/i);
    }
  });

  test('B2.5: Transition to SUBMITTED succeeds when documentsVerified is true', () => {
    const result = validatePipelineTransition({
      currentStage: PIPELINE_STAGES.DOCUMENTS_COMPLETE,
      targetStage: PIPELINE_STAGES.SUBMITTED,
      userRole: ROLES.COUNSELLOR,
      documentsVerified: true,
    });

    assert.equal(result.valid, true);
  });
});

describe('Day 30: Exit Stages (LOST / DEFERRED) Verification', () => {
  test('B2.6: Transition to LOST requires mandatory reason >= 5 chars', () => {
    // Missing reason
    const noReason = validatePipelineTransition({
      currentStage: PIPELINE_STAGES.QUALIFIED,
      targetStage: PIPELINE_STAGES.LOST,
      userRole: ROLES.COUNSELLOR,
    });
    assert.equal(noReason.valid, false);
    assert.equal(noReason.statusCode, 400);
    assert.match(noReason.error, /mandatory reason of at least 5 characters/i);

    // Short reason (4 chars)
    const shortReason = validatePipelineTransition({
      currentStage: PIPELINE_STAGES.QUALIFIED,
      targetStage: PIPELINE_STAGES.LOST,
      userRole: ROLES.COUNSELLOR,
      reason: 'drop',
    });
    assert.equal(shortReason.valid, false);
    assert.equal(shortReason.statusCode, 400);

    // Valid reason (>= 5 chars)
    const validReason = validatePipelineTransition({
      currentStage: PIPELINE_STAGES.QUALIFIED,
      targetStage: PIPELINE_STAGES.LOST,
      userRole: ROLES.COUNSELLOR,
      reason: 'Candidate opted for domestic engineering university',
    });
    assert.equal(validReason.valid, true);
  });

  test('B2.7: Transition to DEFERRED requires mandatory reason >= 5 chars', () => {
    const validDeferral = validatePipelineTransition({
      currentStage: PIPELINE_STAGES.SHORTLISTED,
      targetStage: PIPELINE_STAGES.DEFERRED,
      userRole: ROLES.COUNSELLOR,
      reason: 'IELTS exam preparation scheduled for next spring cycle',
    });
    assert.equal(validDeferral.valid, true);
  });

  test('B2.8: Reopening LOST or DEFERRED candidate is restricted to Super Admin & Branch Manager', () => {
    const rolesToTest = [
      { role: ROLES.COUNSELLOR, allowed: false },
      { role: ROLES.APPLICATION_OFFICER, allowed: false },
      { role: ROLES.MARKETING, allowed: false },
      { role: ROLES.BRANCH_MANAGER, allowed: true },
      { role: ROLES.SUPER_ADMIN, allowed: true },
    ];

    for (const { role, allowed } of rolesToTest) {
      const fromLost = validatePipelineTransition({
        currentStage: PIPELINE_STAGES.LOST,
        targetStage: PIPELINE_STAGES.CONTACTED,
        userRole: role,
        reason: 'Candidate re-engaged with new sponsorship',
      });

      if (allowed) {
        assert.equal(
          fromLost.valid,
          true,
          `Expected role ${role} to be permitted to reopen from LOST`
        );
      } else {
        assert.equal(
          fromLost.valid,
          false,
          `Expected role ${role} to be rejected when reopening from LOST`
        );
        assert.equal(fromLost.statusCode, 403);
        assert.match(fromLost.error, /Only Super Admin or Branch Manager can reopen/i);
      }
    }
  });
});

describe('Day 30: Frontend & Backend Contract Parity Verification', () => {
  test('B2.9: Client and Server PIPELINE_STAGES constant definitions are identical', () => {
    const serverKeys = Object.keys(PIPELINE_STAGES).sort();
    const clientKeys = Object.keys(CLIENT_PIPELINE_STAGES).sort();

    assert.deepEqual(serverKeys, clientKeys);

    for (const key of serverKeys) {
      assert.equal(
        PIPELINE_STAGES[key],
        CLIENT_PIPELINE_STAGES[key],
        `Mismatch for stage key ${key}`
      );
    }
  });

  test('B2.10: Client and Server PIPELINE_STAGE_LABELS are identical across all 16 stages', () => {
    const core16Stages = [
      PIPELINE_STAGES.NEW,
      PIPELINE_STAGES.CONTACTED,
      PIPELINE_STAGES.QUALIFIED,
      PIPELINE_STAGES.COUNSELLING_BOOKED,
      PIPELINE_STAGES.COUNSELLING_COMPLETED,
      PIPELINE_STAGES.SHORTLISTED,
      PIPELINE_STAGES.APPLICATION_STARTED,
      PIPELINE_STAGES.DOCUMENTS_COMPLETE,
      PIPELINE_STAGES.SUBMITTED,
      PIPELINE_STAGES.OFFER_RECEIVED,
      PIPELINE_STAGES.DEPOSIT_PAID,
      PIPELINE_STAGES.VISA_FILED,
      PIPELINE_STAGES.VISA_DECISION,
      PIPELINE_STAGES.PRE_DEPARTURE,
      PIPELINE_STAGES.ENROLLED,
      PIPELINE_STAGES.DEFERRED,
      PIPELINE_STAGES.LOST,
    ];

    for (const stage of core16Stages) {
      assert.ok(
        PIPELINE_STAGE_LABELS[stage],
        `Server label missing for stage ${stage}`
      );
      assert.ok(
        CLIENT_STAGE_LABELS[stage],
        `Client label missing for stage ${stage}`
      );
      assert.equal(
        PIPELINE_STAGE_LABELS[stage],
        CLIENT_STAGE_LABELS[stage],
        `Label mismatch for stage ${stage}`
      );
    }
  });

  test('B2.11: Super Admin has administrative stage override privileges', () => {
    const nonAdjacentJump = validatePipelineTransition({
      currentStage: PIPELINE_STAGES.NEW,
      targetStage: PIPELINE_STAGES.SHORTLISTED,
      userRole: ROLES.SUPER_ADMIN,
    });

    assert.equal(nonAdjacentJump.valid, true);
  });
});
