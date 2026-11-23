/**
 * Aeterna One CRM — Reporting Routes (Day 63)
 * Protected routes for Executive KPIs, Branch Scorecards, Funnel & Counsellor Productivity.
 */

const express = require('express');
const {
  getOverview,
  getBranchScorecards,
  getFunnel,
  getCounsellorPerformance,
  getIntakeTrends,
} = require('./reports.controller');
const { protect } = require('../../middleware/authMiddleware');
const { requireRole } = require('../../middleware/roleMiddleware');
const { requireBranchAccess } = require('../../middleware/branchMiddleware');
const { ROLES } = require('../../config/constants');

const router = express.Router();

router.use(protect);
router.use(requireBranchAccess());

// Executive overview (Super Admin & Branch Manager)
router.get(
  '/overview',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER),
  getOverview
);

// Branch comparative scorecards
router.get(
  '/branch-scorecards',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER),
  getBranchScorecards
);

// 16-Stage Admissions Funnel
router.get(
  '/funnel',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR),
  getFunnel
);

// Counsellor Performance & Velocity
router.get(
  '/counsellor-performance',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER),
  getCounsellorPerformance
);

// Intake Trends & Destination Forecasts
router.get(
  '/intake-trends',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR),
  getIntakeTrends
);

module.exports = router;
