const express = require('express');
const { register, login, getMe, logout, refresh, setupSuperAdmin } = require('./auth.controller');
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
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', logout);
router.get('/me', protect, getMe);

// Privileged Staff Provisioning (Super Admin Only)
router.post('/register', protect, requireRole(ROLES.SUPER_ADMIN), registerValidator, validate, register);

module.exports = router;
