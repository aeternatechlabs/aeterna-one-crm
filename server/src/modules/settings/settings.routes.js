const express = require('express');
const {
  getIntegrationSettings,
  testEmailDispatch,
  testStorageConnection,
  connectResendController,
  disconnectResendController,
} = require('./settings.controller');
const { protect } = require('../../middleware/authMiddleware');
const { requireRole } = require('../../middleware/roleMiddleware');
const { ROLES } = require('../../config/constants');

const router = express.Router();

router.use(protect);
router.use(requireRole(ROLES.SUPER_ADMIN));

router.get('/integrations', getIntegrationSettings);
router.post('/test-email', testEmailDispatch);
router.post('/test-storage', testStorageConnection);
router.post('/resend/connect', connectResendController);
router.post('/resend/disconnect', disconnectResendController);

module.exports = router;
