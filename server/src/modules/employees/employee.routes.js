const express = require('express');
const {
  getEmployees,
  getTrashEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  deleteEmployee,
  restoreEmployee,
  permanentDeleteEmployee,
} = require('./employee.controller');
const { protect } = require('../../middleware/authMiddleware');
const { requireRole } = require('../../middleware/roleMiddleware');
const { requireBranchAccess } = require('../../middleware/branchMiddleware');
const { ROLES } = require('../../config/constants');
const { usersLimiter } = require('../../shield');

const router = express.Router();

// Strict Authentication: All employee endpoints require valid JWT session
router.use(protect);

// Strict RBAC: Employee management is exclusively reserved for Super Admin
router.use(requireRole(ROLES.SUPER_ADMIN));

// Rate-limited queries & operations
router.get('/', usersLimiter, requireBranchAccess(), getEmployees);
router.get('/trash', usersLimiter, getTrashEmployees);
router.get('/:id', getEmployee);
router.post('/', createEmployee);
router.put('/:id', updateEmployee);
router.patch('/:id/status', toggleEmployeeStatus);
router.post('/:id/restore', restoreEmployee);
router.delete('/:id', deleteEmployee);
router.delete('/:id/permanent', permanentDeleteEmployee);

module.exports = router;
