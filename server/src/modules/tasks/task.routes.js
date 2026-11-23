const express = require('express');
const {
  getTasks,
  getDailyQueue,
  getTaskById,
  createTask,
  updateTask,
  logReachout,
  completeTask,
  deleteTask,
} = require('./task.controller');
const { protect } = require('../../middleware/authMiddleware');
const { requireRole } = require('../../middleware/roleMiddleware');
const { requireBranchAccess } = require('../../middleware/branchMiddleware');
const { ROLES } = require('../../config/constants');

const router = express.Router();

router.use(protect);
router.use(requireBranchAccess());

router.get(
  '/daily-queue',
  requireRole(
    ROLES.SUPER_ADMIN,
    ROLES.BRANCH_MANAGER,
    ROLES.COUNSELLOR,
    ROLES.APPLICATION_OFFICER,
    ROLES.MARKETING
  ),
  getDailyQueue
);

router.get(
  '/',
  requireRole(
    ROLES.SUPER_ADMIN,
    ROLES.BRANCH_MANAGER,
    ROLES.COUNSELLOR,
    ROLES.APPLICATION_OFFICER,
    ROLES.MARKETING
  ),
  getTasks
);

router.post(
  '/',
  requireRole(
    ROLES.SUPER_ADMIN,
    ROLES.BRANCH_MANAGER,
    ROLES.COUNSELLOR,
    ROLES.APPLICATION_OFFICER
  ),
  createTask
);

router.get(
  '/:id',
  requireRole(
    ROLES.SUPER_ADMIN,
    ROLES.BRANCH_MANAGER,
    ROLES.COUNSELLOR,
    ROLES.APPLICATION_OFFICER,
    ROLES.MARKETING
  ),
  getTaskById
);

router.patch(
  '/:id',
  requireRole(
    ROLES.SUPER_ADMIN,
    ROLES.BRANCH_MANAGER,
    ROLES.COUNSELLOR,
    ROLES.APPLICATION_OFFICER
  ),
  updateTask
);

router.post(
  '/:id/reachout-log',
  requireRole(
    ROLES.SUPER_ADMIN,
    ROLES.BRANCH_MANAGER,
    ROLES.COUNSELLOR,
    ROLES.APPLICATION_OFFICER
  ),
  logReachout
);

router.post(
  '/:id/complete',
  requireRole(
    ROLES.SUPER_ADMIN,
    ROLES.BRANCH_MANAGER,
    ROLES.COUNSELLOR,
    ROLES.APPLICATION_OFFICER
  ),
  completeTask
);

router.delete(
  '/:id',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER),
  deleteTask
);

module.exports = router;
