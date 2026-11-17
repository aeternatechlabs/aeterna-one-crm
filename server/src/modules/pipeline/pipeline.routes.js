const express = require('express');
const {
  getPipeline,
  updateStage,
  toggleDocumentsVerified,
  createStudent,
} = require('./pipeline.controller');
const { protect } = require('../../middleware/authMiddleware');
const { requireRole } = require('../../middleware/roleMiddleware');
const { requireBranchAccess } = require('../../middleware/branchMiddleware');
const { ROLES } = require('../../config/constants');
const { pipelineLimiter } = require('../../shield');

const router = express.Router();

router.use(pipelineLimiter);
router.use(protect);
router.use(requireBranchAccess());

// 1. View Pipeline: super_admin, branch_manager, counsellor, application_officer (marketing excluded)
router.get(
  '/',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR, ROLES.APPLICATION_OFFICER),
  getPipeline
);

// 2. Create Candidate: super_admin, branch_manager, counsellor
router.post(
  '/',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR),
  createStudent
);

// 3. Move Pipeline Stage: super_admin, branch_manager, counsellor
router.patch(
  '/:id/stage',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR),
  updateStage
);

// 4. Verify Documents: super_admin, branch_manager, application_officer
router.patch(
  '/:id/documents',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.APPLICATION_OFFICER),
  toggleDocumentsVerified
);

module.exports = router;
