const express = require('express');
const {
  createUploadIntent,
  uploadDocument,
  updateDocument,
  getStudentDocuments,
  getDownloadUrl,
  getPreviewUrl,
  verifyDocument,
  softDeleteDocument,
  permanentDeleteDocument,
} = require('./vault.controller');
const { protect } = require('../../middleware/authMiddleware');
const { requireRole } = require('../../middleware/roleMiddleware');
const { requireBranchAccess } = require('../../middleware/branchMiddleware');
const { ROLES } = require('../../config/constants');
const { pipelineLimiter } = require('../../shield');

const router = express.Router({ mergeParams: true });

router.use(pipelineLimiter);
router.use(protect);
router.use(requireBranchAccess());

// 1. Upload Intent: Super Admin, Branch Manager, Counsellor, Application Officer
router.post(
  '/upload-intent',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR, ROLES.APPLICATION_OFFICER),
  createUploadIntent
);

// 2. Upload Document: Super Admin, Branch Manager, Counsellor, Application Officer
router.post(
  '/upload',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR, ROLES.APPLICATION_OFFICER),
  uploadDocument
);

// 3. List Documents Checklist: Super Admin, Branch Manager, Counsellor, Application Officer (Marketing strictly 403)
router.get(
  '/',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR, ROLES.APPLICATION_OFFICER),
  getStudentDocuments
);

// 4. Download Document Signed URL: Super Admin, Branch Manager, Counsellor, Application Officer
router.get(
  '/:docId/download',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR, ROLES.APPLICATION_OFFICER),
  getDownloadUrl
);

// 5. Preview Document Signed URL: Super Admin, Branch Manager, Counsellor, Application Officer
router.get(
  '/:docId/preview',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR, ROLES.APPLICATION_OFFICER),
  getPreviewUrl
);

// 6. Verify Document: Super Admin, Branch Manager, Application Officer ONLY (Counsellor strictly 403)
router.patch(
  '/:docId/verify',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.APPLICATION_OFFICER),
  verifyDocument
);

// 7. Update Document (Metadata or File Replacement on Cloudflare R2): Super Admin, Branch Manager, Application Officer
router.put(
  '/:docId',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.APPLICATION_OFFICER),
  updateDocument
);

// 8. Soft-Delete Document (Purges from Cloudflare R2): Super Admin, Branch Manager ONLY (Counsellor & Application Officer strictly 403)
router.delete(
  '/:docId',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER),
  softDeleteDocument
);

// 9. Permanent Purge Document: Super Admin, Branch Manager ONLY
router.delete(
  '/:docId/permanent',
  requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER),
  permanentDeleteDocument
);

module.exports = router;
