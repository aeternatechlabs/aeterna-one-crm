const express = require('express');
const {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  addStudentNote,
  convertLead,
  addAcademicRecord,
  addTestScore,
  verifyTestScore,
  updateFinancial,
  updatePreferences,
  addApplication,
  updateApplication,
} = require('./student.controller');
const { protect } = require('../../middleware/authMiddleware');
const { requireRole } = require('../../middleware/roleMiddleware');
const { requireBranchAccess } = require('../../middleware/branchMiddleware');
const { ROLES } = require('../../config/constants');
const { pipelineLimiter } = require('../../shield');

const router = express.Router();

router.use(pipelineLimiter);
router.use(protect);
router.use(requireBranchAccess());

// 1. List Student Profiles: Super Admin, Branch Manager, Counsellor, Application Officer (Marketing strictly 403)
router.get(
  '/',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR, ROLES.APPLICATION_OFFICER),
  getStudents
);

// 2. Lead Conversion: Super Admin, Branch Manager, Counsellor
router.post(
  '/convert-lead',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR),
  convertLead
);

// 3. Get Student Profile by ID: Super Admin, Branch Manager, Counsellor, Application Officer
router.get(
  '/:id',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR, ROLES.APPLICATION_OFFICER),
  getStudentById
);

// 4. Create Student Profile directly: Super Admin, Branch Manager, Counsellor
router.post(
  '/',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR),
  createStudent
);

// 5. Update Student Profile: Super Admin, Branch Manager, Counsellor
router.patch(
  '/:id',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR),
  updateStudent
);

// 6. Add Note to Timeline: Super Admin, Branch Manager, Counsellor
router.post(
  '/:id/notes',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR),
  addStudentNote
);

// 7. Add Academic Qualification: Super Admin, Branch Manager, Counsellor (Day 35)
router.post(
  '/:id/academics',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR),
  addAcademicRecord
);

// 8. Add Test Score: Super Admin, Branch Manager, Counsellor (Day 35)
router.post(
  '/:id/test-scores',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR),
  addTestScore
);

// 9. Verify Test Score: Super Admin, Branch Manager, Application Officer (Counsellor forbidden) (Day 35)
router.patch(
  '/:id/test-scores/:scoreId/verify',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.APPLICATION_OFFICER),
  verifyTestScore
);

// 10. Update Financial / Budget: Super Admin, Branch Manager, Counsellor (Day 36)
router.patch(
  '/:id/financial',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR),
  updateFinancial
);

// 11. Update Preferences: Super Admin, Branch Manager, Counsellor (Day 36)
router.patch(
  '/:id/preferences',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR),
  updatePreferences
);

// 12. Add Target University Application: Super Admin, Branch Manager, Counsellor, Application Officer (Day 43)
router.post(
  '/:id/applications',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR, ROLES.APPLICATION_OFFICER),
  addApplication
);

// 13. Update Target University Application: Super Admin, Branch Manager, Application Officer (Day 43)
router.patch(
  '/:id/applications/:appId',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.APPLICATION_OFFICER),
  updateApplication
);

// 14. Document Vault & Verification Sub-Router (Days 38-42)
const vaultRoutes = require('../vault/vault.routes');
router.use('/:id/vault', vaultRoutes);

module.exports = router;
