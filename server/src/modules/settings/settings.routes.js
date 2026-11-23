const express = require('express');
const {
  getIntegrationSettings,
  testEmailDispatch,
  testStorageConnection,
} = require('./settings.controller');
const { protect } = require('../../middleware/authMiddleware');
const { requireRole } = require('../../middleware/roleMiddleware');
const { ROLES } = require('../../config/constants');

const router = express.Router();

router.use(protect);
router.use(requireRole(ROLES.SUPER_ADMIN));

// 1. Get Integration Settings & Storage Metrics (Super Admin Only)
router.get('/integrations', getIntegrationSettings);

// 2. Send Live Test Email to verify Brevo configuration (Super Admin Only)
router.post('/test-email', testEmailDispatch);

// 3. Test Cloudflare R2 Connection & Permissions (Super Admin Only)
router.post('/test-storage', testStorageConnection);

module.exports = router;
