/**
 * Aeterna One CRM — Reports Controller (Day 63)
 * Enforces RBAC, branch containment, input sanitization, and structured responses.
 */

const reportsService = require('./reports.service');
const { BRANCHES, ROLES } = require('../../config/constants');

/**
 * Resolves safe branch scope based on authenticated user identity
 */
function resolveSafeBranch(req) {
  const requestedBranch = req.query.branch || 'all';
  // Super Admin has global omni-branch visibility
  if (req.user && req.user.role === ROLES.SUPER_ADMIN) {
    return requestedBranch;
  }
  // Other staff (branch_manager, counsellor) strictly restricted to their own branch
  return req.user && req.user.branch ? req.user.branch : BRANCHES.BENGALURU;
}

/**
 * GET /api/v1/reports/overview
 */
async function getOverview(req, res, next) {
  try {
    const branch = resolveSafeBranch(req);
    const period = req.query.period || '30';
    const data = await reportsService.getExecutiveOverview(branch, period);

    return res.status(200).json({
      success: true,
      message: 'Executive reporting overview retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/reports/branch-scorecards
 */
async function getBranchScorecards(req, res, next) {
  try {
    const branch = resolveSafeBranch(req);
    const role = req.user ? req.user.role : ROLES.BRANCH_MANAGER;
    const period = req.query.period || '30';
    const data = await reportsService.getBranchScorecards(branch, role, period);

    return res.status(200).json({
      success: true,
      message: 'Branch scorecards retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/reports/funnel
 */
async function getFunnel(req, res, next) {
  try {
    const branch = resolveSafeBranch(req);
    const period = req.query.period || '30';
    const data = await reportsService.getConversionFunnel(branch, period);

    return res.status(200).json({
      success: true,
      message: 'Conversion funnel analytics retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/reports/counsellor-performance
 */
async function getCounsellorPerformance(req, res, next) {
  try {
    const branch = resolveSafeBranch(req);
    const period = req.query.period || '30';
    const data = await reportsService.getCounsellorPerformance(branch, period);

    return res.status(200).json({
      success: true,
      message: 'Counsellor performance metrics retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/reports/intake-trends
 */
async function getIntakeTrends(req, res, next) {
  try {
    const branch = resolveSafeBranch(req);
    const data = await reportsService.getIntakeTrends(branch);

    return res.status(200).json({
      success: true,
      message: 'Intake and destination trends retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getOverview,
  getBranchScorecards,
  getFunnel,
  getCounsellorPerformance,
  getIntakeTrends,
};
