const express = require('express');
const { getUsers } = require('./user.controller');
const { protect } = require('../../middleware/authMiddleware');
const { requireRole } = require('../../middleware/roleMiddleware');
const { requireBranchAccess } = require('../../middleware/branchMiddleware');
const { ROLES } = require('../../config/constants');
const { usersLimiter } = require('../../shield');

const router = express.Router();

router.use(protect);

router.get(
  '/',
  usersLimiter,
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER),
  requireBranchAccess(),
  getUsers
);

module.exports = router;
