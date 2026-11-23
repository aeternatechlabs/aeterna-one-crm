const express = require('express');
const {
  getTemplates,
  previewTemplate,
  sendOutboundEmail,
  sendOutboundWhatsApp,
  getActivities,
} = require('./communications.controller');
const { protect } = require('../../middleware/authMiddleware');
const { requireRole } = require('../../middleware/roleMiddleware');
const { requireBranchAccess } = require('../../middleware/branchMiddleware');
const { ROLES } = require('../../config/constants');

const router = express.Router();

router.use(protect);
router.use(requireBranchAccess());

router.get('/templates', getTemplates);
router.post('/templates/preview', previewTemplate);

router.post(
  '/send-email',
  requireRole(
    ROLES.SUPER_ADMIN,
    ROLES.BRANCH_MANAGER,
    ROLES.COUNSELLOR,
    ROLES.APPLICATION_OFFICER
  ),
  sendOutboundEmail
);

router.post(
  '/send-whatsapp',
  requireRole(
    ROLES.SUPER_ADMIN,
    ROLES.BRANCH_MANAGER,
    ROLES.COUNSELLOR,
    ROLES.APPLICATION_OFFICER
  ),
  sendOutboundWhatsApp
);

router.get('/activities', getActivities);

module.exports = router;
