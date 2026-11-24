const express = require('express');
const rateLimit = require('express-rate-limit');
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

// Outbound email rate limiter to prevent corporate SMTP abuse & accidental bulk email floods (30 req / 15 min)
const outboundEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many outbound email requests. Please wait before dispatching more emails.',
  },
});

router.use(protect);
router.use(requireBranchAccess());

router.get('/templates', getTemplates);
router.post('/templates/preview', previewTemplate);

router.post(
  '/send-email',
  outboundEmailLimiter,
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
