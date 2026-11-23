const express = require('express');
const {
  register,
  login,
  getMe,
  logout,
  refresh,
  setupSuperAdmin,
  getPermissionsMatrix,
  checkPermission,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
} = require('./auth.controller');
const { registerValidator, loginValidator } = require('./auth.validator');
const { validate } = require('../../middleware/validateMiddleware');
const { protect } = require('../../middleware/authMiddleware');
const { requireRole } = require('../../middleware/roleMiddleware');
const { ROLES } = require('../../config/constants');
const { authLimiter, refreshLimiter } = require('../../shield');

const router = express.Router();

// One-Time Super Admin Initial Provisioning (Guarded by Developer Key & Single Super Admin rule)
router.post('/setup-super-admin', authLimiter, setupSuperAdmin);

// Public Authentication
router.post('/login', authLimiter, loginValidator, validate, login);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/verify-reset-otp', authLimiter, verifyResetOTP);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', logout);
router.get('/me', protect, getMe);

// Centralized Role Permissions & Access Control Inspection
router.get('/permissions-matrix', protect, getPermissionsMatrix);
router.post('/check-permission', protect, checkPermission);

// Privileged Staff Provisioning (Super Admin Only)
router.post('/register', protect, requireRole(ROLES.SUPER_ADMIN), registerValidator, validate, register);

module.exports = router;
