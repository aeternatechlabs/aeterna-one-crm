const express = require('express');
const {
  getInstitutions,
  getInstitutionStats,
  getInstitution,
  createInstitution,
  updateInstitution,
  deleteInstitution,
} = require('./institution.controller');
const { protect } = require('../../middleware/authMiddleware');
const { requireRole } = require('../../middleware/roleMiddleware');
const { ROLES } = require('../../config/constants');
const { globalLimiter } = require('../../shield');

const router = express.Router();

// Strict Rate Limiting & Protection
router.use(globalLimiter);
router.use(protect);

const PERMITTED_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.BRANCH_MANAGER,
  ROLES.COUNSELLOR,
  ROLES.APPLICATION_OFFICER,
];

router.get('/', requireRole(...PERMITTED_ROLES), getInstitutions);
router.get('/stats', requireRole(...PERMITTED_ROLES), getInstitutionStats);
router.get('/:id', requireRole(...PERMITTED_ROLES), getInstitution);
router.post('/', requireRole(...PERMITTED_ROLES), createInstitution);
router.put('/:id', requireRole(...PERMITTED_ROLES), updateInstitution);
router.delete('/:id', requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER), deleteInstitution);

module.exports = router;
