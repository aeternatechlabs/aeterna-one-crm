const express = require('express');
const {
  getLeads,
  getLeadStats,
  getLead,
  createLead,
  updateLead,
  updateLeadStatus,
  convertToStudent,
  deleteLead,
} = require('./lead.controller');
const { protect } = require('../../middleware/authMiddleware');
const { requireRole } = require('../../middleware/roleMiddleware');
const { ROLES } = require('../../config/constants');

const router = express.Router();

// All lead routes require authentication
router.use(protect);

// Permitted lead management roles
const LEAD_PERMITTED_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.BRANCH_MANAGER,
  ROLES.COUNSELLOR,
  ROLES.MARKETING,
];

router.get('/', requireRole(...LEAD_PERMITTED_ROLES), getLeads);
router.get('/stats', requireRole(...LEAD_PERMITTED_ROLES), getLeadStats);
router.post('/', requireRole(...LEAD_PERMITTED_ROLES), createLead);
router.get('/:id', requireRole(...LEAD_PERMITTED_ROLES), getLead);
router.put('/:id', requireRole(...LEAD_PERMITTED_ROLES), updateLead);
router.patch('/:id/status', requireRole(...LEAD_PERMITTED_ROLES), updateLeadStatus);
router.post('/:id/convert', requireRole(...LEAD_PERMITTED_ROLES), convertToStudent);
router.delete('/:id', requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER), deleteLead);

module.exports = router;
