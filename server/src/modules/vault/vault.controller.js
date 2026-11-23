const mongoose = require('mongoose');
const Student = require('../students/student.model');
const PipelineStudent = require('../pipeline/pipeline.model');
const Document = require('./document.model');
const DocumentAudit = require('./documentAudit.model');
const {
  validateFileMetadata,
  verifyFileMagicBytes,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_DOCUMENT_CATEGORIES,
} = require('./fileValidation');
const {
  buildStorageKey,
  generateSignedDownloadToken,
  verifySignedDownloadToken,
  putObject,
  getObject,
  deleteObject,
  isR2Configured,
  generateR2PresignedUrl,
} = require('./storage.service');
const { asyncHandler, ApiError, ApiResponse } = require('../../utils/devilWrapper');
const { ROLES } = require('../../config/constants');

// Mandatory categories required to unlock the pipeline documentsVerified stage gate
const MANDATORY_GATE_CATEGORIES = ['passport_identity', 'academic_transcripts', 'financial_affidavits'];

/**
 * Helper to check and sync pipeline documentsVerified gate
 */
async function syncPipelineDocumentGate(student) {
  try {
    const verifiedDocs = await Document.find({
      student: student._id,
      isDeleted: false,
      isVerified: true,
    }).select('category');

    const verifiedCategories = new Set(verifiedDocs.map((d) => d.category));
    const isComplete = MANDATORY_GATE_CATEGORIES.every((cat) => verifiedCategories.has(cat));

    // Update pipeline candidate if one exists
    await PipelineStudent.updateMany(
      {
        branch: student.branch,
        email: student.email.toLowerCase().trim(),
      },
      {
        $set: { documentsVerified: isComplete },
      }
    );

    return isComplete;
  } catch {
    // Non-fatal if sync encounters no pipeline record
    return false;
  }
}

/**
 * 1. Create Upload Intent (Day 38)
 * POST /api/v1/students/:id/vault/upload-intent
 */
const createUploadIntent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fileName, fileSize, mimeType, category, title } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid student ID format');
  }

  const student = await Student.findOne({ _id: id, isDeleted: false });
  if (!student) {
    throw new ApiError(404, 'Student profile not found');
  }

  // Branch isolation
  if (
    req.user?.role !== ROLES.SUPER_ADMIN &&
    req.branchScope !== 'all' &&
    student.branch !== req.user?.branch
  ) {
    throw new ApiError(403, 'Unauthorized to upload documents for student outside your assigned branch');
  }

  const metaValidation = validateFileMetadata({ fileName, fileSize, mimeType, category });
  if (!metaValidation.valid) {
    throw new ApiError(400, metaValidation.error);
  }

  const storageKey = buildStorageKey({
    branch: student.branch,
    studentId: student.studentId,
    category,
    fileName,
  });

  const uploadToken = generateSignedDownloadToken({
    storageKey,
    fileName,
    disposition: 'upload',
    ttlSeconds: 900,
  });

  await DocumentAudit.create({
    student: student._id,
    studentIdCode: student.studentId,
    branch: student.branch,
    action: 'DOCUMENT_UPLOAD_INTENT',
    actor: req.user._id,
    actorName: req.user.name || 'Staff',
    actorRole: req.user.role || '',
    details: { fileName, mimeType, fileSize, category, storageKey },
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        uploadToken,
        storageKey,
        expiresIn: 900,
        maxSizeBytes: MAX_FILE_SIZE_BYTES,
        studentId: student.studentId,
      },
      'Upload intent registered successfully'
    )
  );
});

/**
 * 2. Upload Document (Day 38)
 * POST /api/v1/students/:id/vault/upload
 */
const uploadDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fileName, fileSize, mimeType, category, title, fileBase64, storageKey: providedKey } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid student ID format');
  }

  const student = await Student.findOne({ _id: id, isDeleted: false });
  if (!student) {
    throw new ApiError(404, 'Student profile not found');
  }

  // Branch isolation
  if (
    req.user?.role !== ROLES.SUPER_ADMIN &&
    req.branchScope !== 'all' &&
    student.branch !== req.user?.branch
  ) {
    throw new ApiError(403, 'Unauthorized to upload documents for student outside your assigned branch');
  }

  if (!title || typeof title !== 'string' || title.trim().length < 2) {
    throw new ApiError(400, 'Document title is required (minimum 2 characters)');
  }

  const metaValidation = validateFileMetadata({ fileName, fileSize, mimeType, category });
  if (!metaValidation.valid) {
    throw new ApiError(400, metaValidation.error);
  }

  if (!fileBase64 || typeof fileBase64 !== 'string') {
    throw new ApiError(400, 'File content (base64 string) is required');
  }

  // Strip potential data URL prefix
  const pureBase64 = fileBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
  const buffer = Buffer.from(pureBase64, 'base64');

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new ApiError(400, 'Uploaded file exceeds the maximum limit of 10MB');
  }

  // Magic bytes binary verification
  const magicValidation = verifyFileMagicBytes(buffer, mimeType);
  if (!magicValidation.valid) {
    throw new ApiError(400, magicValidation.error);
  }

  const storageKey =
    providedKey ||
    buildStorageKey({
      branch: student.branch,
      studentId: student.studentId,
      category,
      fileName,
    });

  // Store file binary in storage adapter (Cloudflare R2 when configured, local mirror fallback)
  const storageResult = await putObject(storageKey, buffer, mimeType);

  // Create Document record
  const newDoc = new Document({
    student: student._id,
    studentIdCode: student.studentId,
    branch: student.branch,
    category,
    title: title.trim(),
    fileName,
    fileSize: buffer.length,
    mimeType,
    storageKey,
    storageProvider: storageResult.provider || (isR2Configured() ? 'cloudflare_r2' : 'local'),
    isVerified: false,
  });

  await newDoc.save();

  // Audit event
  await DocumentAudit.create({
    document: newDoc._id,
    student: student._id,
    studentIdCode: student.studentId,
    branch: student.branch,
    action: 'DOCUMENT_UPLOADED',
    actor: req.user._id,
    actorName: req.user.name || 'Staff',
    actorRole: req.user.role || '',
    details: {
      documentId: newDoc._id,
      fileName,
      mimeType,
      fileSize: buffer.length,
      category,
      storageKey,
    },
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      { document: newDoc },
      'Document uploaded and stored in vault successfully'
    )
  );
});

/**
 * 3. List Documents Checklist (Day 40)
 * GET /api/v1/students/:id/vault
 */
const getStudentDocuments = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid student ID format');
  }

  const student = await Student.findOne({ _id: id, isDeleted: false });
  if (!student) {
    throw new ApiError(404, 'Student profile not found');
  }

  // Branch isolation
  if (
    req.user?.role !== ROLES.SUPER_ADMIN &&
    req.branchScope !== 'all' &&
    student.branch !== req.user?.branch
  ) {
    throw new ApiError(403, 'Unauthorized to view documents for student outside your assigned branch');
  }

  const documents = await Document.find({
    student: student._id,
    isDeleted: false,
  }).sort({ createdAt: -1 });

  // Verification checklist computation
  const categoryStatus = {};
  for (const cat of ALLOWED_DOCUMENT_CATEGORIES) {
    const catDocs = documents.filter((d) => d.category === cat);
    categoryStatus[cat] = {
      uploaded: catDocs.length > 0,
      count: catDocs.length,
      verifiedCount: catDocs.filter((d) => d.isVerified).length,
      hasVerified: catDocs.some((d) => d.isVerified),
      isMandatory: MANDATORY_GATE_CATEGORIES.includes(cat),
    };
  }

  const allMandatoryVerified = MANDATORY_GATE_CATEGORIES.every(
    (cat) => categoryStatus[cat] && categoryStatus[cat].hasVerified
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        documents,
        categoryStatus,
        isChecklistComplete: allMandatoryVerified,
        studentId: student.studentId,
      },
      'Student vault documents retrieved successfully'
    )
  );
});

/**
 * 4. Get Signed Download URL (Day 39)
 * GET /api/v1/students/:id/vault/:docId/download
 */
const getDownloadUrl = asyncHandler(async (req, res) => {
  const { id, docId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(docId)) {
    throw new ApiError(400, 'Invalid ID format');
  }

  const student = await Student.findOne({ _id: id, isDeleted: false });
  if (!student) {
    throw new ApiError(404, 'Student profile not found');
  }

  // Branch isolation
  if (
    req.user?.role !== ROLES.SUPER_ADMIN &&
    req.branchScope !== 'all' &&
    student.branch !== req.user?.branch
  ) {
    throw new ApiError(403, 'Unauthorized to download documents for student outside your assigned branch');
  }

  const document = await Document.findOne({
    _id: docId,
    student: student._id,
    isDeleted: false,
  });

  if (!document) {
    throw new ApiError(404, 'Document record not found');
  }

  const token = generateSignedDownloadToken({
    storageKey: document.storageKey,
    fileName: document.fileName,
    disposition: 'attachment',
    ttlSeconds: 900,
  });

  await DocumentAudit.create({
    document: document._id,
    student: student._id,
    studentIdCode: student.studentId,
    branch: student.branch,
    action: 'DOCUMENT_DOWNLOAD_REQUESTED',
    actor: req.user._id,
    actorName: req.user.name || 'Staff',
    actorRole: req.user.role || '',
    details: { documentId: document._id, fileName: document.fileName },
  });

  const r2PresignedUrl = isR2Configured()
    ? generateR2PresignedUrl(document.storageKey, { expiresIn: 900 })
    : null;
  const downloadUrl = r2PresignedUrl || `/api/v1/vault-storage/file?token=${token}`;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        downloadUrl,
        expiresIn: 900,
        fileName: document.fileName,
        provider: document.storageProvider,
      },
      'Signed download link generated successfully'
    )
  );
});

/**
 * 5. Get Scoped Inline Preview URL (Day 39)
 * GET /api/v1/students/:id/vault/:docId/preview
 */
const getPreviewUrl = asyncHandler(async (req, res) => {
  const { id, docId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(docId)) {
    throw new ApiError(400, 'Invalid ID format');
  }

  const student = await Student.findOne({ _id: id, isDeleted: false });
  if (!student) {
    throw new ApiError(404, 'Student profile not found');
  }

  // Branch isolation
  if (
    req.user?.role !== ROLES.SUPER_ADMIN &&
    req.branchScope !== 'all' &&
    student.branch !== req.user?.branch
  ) {
    throw new ApiError(403, 'Unauthorized to preview documents for student outside your assigned branch');
  }

  const document = await Document.findOne({
    _id: docId,
    student: student._id,
    isDeleted: false,
  });

  if (!document) {
    throw new ApiError(404, 'Document record not found');
  }

  const token = generateSignedDownloadToken({
    storageKey: document.storageKey,
    fileName: document.fileName,
    disposition: 'inline',
    ttlSeconds: 900,
  });

  await DocumentAudit.create({
    document: document._id,
    student: student._id,
    studentIdCode: student.studentId,
    branch: student.branch,
    action: 'DOCUMENT_PREVIEW_REQUESTED',
    actor: req.user._id,
    actorName: req.user.name || 'Staff',
    actorRole: req.user.role || '',
    details: { documentId: document._id, fileName: document.fileName },
  });

  const r2PresignedUrl = isR2Configured()
    ? generateR2PresignedUrl(document.storageKey, { expiresIn: 900 })
    : null;
  const previewUrl = r2PresignedUrl || `/api/v1/vault-storage/file?token=${token}`;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        previewUrl,
        expiresIn: 900,
        fileName: document.fileName,
        mimeType: document.mimeType,
        provider: document.storageProvider,
      },
      'Signed preview link generated successfully'
    )
  );
});

/**
 * 6. Serve Secure Storage File via Signed Token (Day 39)
 * GET /api/v1/vault-storage/file
 */
const serveStorageFile = asyncHandler(async (req, res) => {
  const { token } = req.query;

  const verification = verifySignedDownloadToken(token);
  if (!verification.valid) {
    throw new ApiError(403, verification.error);
  }

  const { key, name, disp } = verification.payload;

  let fileBuffer;
  try {
    fileBuffer = await getObject(key);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new ApiError(404, 'Storage object not found');
    }
    throw err;
  }

  // Safe headers
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `${disp}; filename="${name}"`);
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  return res.send(fileBuffer);
});

/**
 * 7. Verify Document Gate (Day 40)
 * PATCH /api/v1/students/:id/vault/:docId/verify
 */
const verifyDocument = asyncHandler(async (req, res) => {
  const { id, docId } = req.params;
  const { isVerified = true, verificationNotes, rejectionReason } = req.body;

  // Authorization: Only Super Admin, Branch Manager, or Application Officer can verify
  const canVerify =
    req.user?.role === ROLES.SUPER_ADMIN ||
    req.user?.role === ROLES.BRANCH_MANAGER ||
    req.user?.role === ROLES.APPLICATION_OFFICER;

  if (!canVerify) {
    throw new ApiError(403, 'Only Branch Manager, Application Officer, or Super Admin can verify documents');
  }

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(docId)) {
    throw new ApiError(400, 'Invalid ID format');
  }

  const student = await Student.findOne({ _id: id, isDeleted: false });
  if (!student) {
    throw new ApiError(404, 'Student profile not found');
  }

  // Branch isolation
  if (
    req.user?.role !== ROLES.SUPER_ADMIN &&
    req.branchScope !== 'all' &&
    student.branch !== req.user?.branch
  ) {
    throw new ApiError(403, 'Unauthorized to verify documents for student outside your assigned branch');
  }

  const document = await Document.findOne({
    _id: docId,
    student: student._id,
    isDeleted: false,
  });

  if (!document) {
    throw new ApiError(404, 'Document record not found');
  }

  document.isVerified = Boolean(isVerified);
  document.verifiedBy = req.user._id;
  document.verifiedByName = req.user.name || 'Staff';
  document.verifiedAt = new Date();
  if (verificationNotes) document.verificationNotes = String(verificationNotes).trim();
  if (rejectionReason) document.rejectionReason = String(rejectionReason).trim();

  await document.save();

  // Audit event
  const action = document.isVerified ? 'DOCUMENT_VERIFIED' : 'DOCUMENT_VERIFICATION_REJECTED';
  await DocumentAudit.create({
    document: document._id,
    student: student._id,
    studentIdCode: student.studentId,
    branch: student.branch,
    action,
    actor: req.user._id,
    actorName: req.user.name || 'Staff',
    actorRole: req.user.role || '',
    details: {
      documentId: document._id,
      category: document.category,
      isVerified: document.isVerified,
      verificationNotes: document.verificationNotes,
      rejectionReason: document.rejectionReason,
    },
  });

  // Sync checklist state with Pipeline documentsVerified stage gate
  const gateComplete = await syncPipelineDocumentGate(student);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        document,
        isChecklistComplete: gateComplete,
      },
      `Document ${document.isVerified ? 'verified' : 'rejected'} successfully`
    )
  );
});

/**
 * 8. Update Document Metadata or Replace File (Cloudflare R2 Synchronized)
 * PUT /api/v1/students/:id/vault/:docId
 */
const updateDocument = asyncHandler(async (req, res) => {
  const { id, docId } = req.params;
  const { title, category, fileBase64, fileName, fileSize, mimeType } = req.body;

  // Authorization: Super Admin, Branch Manager, Application Officer
  const canEdit =
    req.user?.role === ROLES.SUPER_ADMIN ||
    req.user?.role === ROLES.BRANCH_MANAGER ||
    req.user?.role === ROLES.APPLICATION_OFFICER;

  if (!canEdit) {
    throw new ApiError(403, 'Unauthorized to update document metadata or content');
  }

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(docId)) {
    throw new ApiError(400, 'Invalid ID format');
  }

  const student = await Student.findOne({ _id: id, isDeleted: false });
  if (!student) {
    throw new ApiError(404, 'Student profile not found');
  }

  // Branch isolation
  if (
    req.user?.role !== ROLES.SUPER_ADMIN &&
    req.branchScope !== 'all' &&
    student.branch !== req.user?.branch
  ) {
    throw new ApiError(403, 'Unauthorized to update documents for student outside your assigned branch');
  }

  const document = await Document.findOne({
    _id: docId,
    student: student._id,
    isDeleted: false,
  });

  if (!document) {
    throw new ApiError(404, 'Document record not found');
  }

  let fileReplaced = false;
  const oldStorageKey = document.storageKey;

  // 1. If replacement file binary is uploaded, update Cloudflare R2
  if (fileBase64 && typeof fileBase64 === 'string') {
    const metaValidation = validateFileMetadata({
      fileName: fileName || document.fileName,
      fileSize: fileSize || 0,
      mimeType: mimeType || document.mimeType,
      category: category || document.category,
    });
    if (!metaValidation.valid) {
      throw new ApiError(400, metaValidation.error);
    }

    const pureBase64 = fileBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
    const buffer = Buffer.from(pureBase64, 'base64');

    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new ApiError(400, 'Uploaded replacement file exceeds maximum limit of 10MB');
    }

    const effectiveMimeType = mimeType || document.mimeType;
    const magicValidation = verifyFileMagicBytes(buffer, effectiveMimeType);
    if (!magicValidation.valid) {
      throw new ApiError(400, magicValidation.error);
    }

    const newFileName = fileName || document.fileName;
    const newCategory = category || document.category;
    const newStorageKey = buildStorageKey({
      branch: student.branch,
      studentId: student.studentId,
      category: newCategory,
      fileName: newFileName,
    });

    // Write new file to Cloudflare R2 / Storage
    const storageResult = await putObject(newStorageKey, buffer, effectiveMimeType);

    // Delete old file from Cloudflare R2 if key changed
    if (oldStorageKey && oldStorageKey !== newStorageKey) {
      await deleteObject(oldStorageKey);
    }

    document.storageKey = newStorageKey;
    document.storageProvider = storageResult.provider || (isR2Configured() ? 'cloudflare_r2' : 'local');
    document.fileName = newFileName;
    document.fileSize = buffer.length;
    document.mimeType = effectiveMimeType;
    document.isVerified = false; // Reset verification because document binary changed
    document.verifiedBy = null;
    document.verifiedByName = '';
    document.verifiedAt = null;
    fileReplaced = true;
  }

  // 2. Update metadata fields
  if (title && typeof title === 'string' && title.trim().length >= 2) {
    document.title = title.trim();
  }
  if (category && ALLOWED_DOCUMENT_CATEGORIES.includes(category)) {
    document.category = category;
  }

  await document.save();

  // Audit event
  await DocumentAudit.create({
    document: document._id,
    student: student._id,
    studentIdCode: student.studentId,
    branch: student.branch,
    action: fileReplaced ? 'DOCUMENT_FILE_REPLACED' : 'DOCUMENT_METADATA_UPDATED',
    actor: req.user._id,
    actorName: req.user.name || 'Staff',
    actorRole: req.user.role || '',
    details: {
      documentId: document._id,
      title: document.title,
      category: document.category,
      fileReplaced,
      storageKey: document.storageKey,
      storageProvider: document.storageProvider,
    },
  });

  // Re-sync checklist gate
  const gateComplete = await syncPipelineDocumentGate(student);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        document,
        isChecklistComplete: gateComplete,
        fileReplaced,
      },
      fileReplaced
        ? 'Document replaced and synchronized with Cloudflare R2 successfully'
        : 'Document metadata updated successfully'
    )
  );
});

/**
 * 9. Delete Document from Vault & Purge from Cloudflare R2
 * DELETE /api/v1/students/:id/vault/:docId
 * Query: ?purge=true to permanently purge from Cloudflare R2 and remove MongoDB document
 */
const softDeleteDocument = asyncHandler(async (req, res) => {
  const { id, docId } = req.params;
  const isPurge = Boolean(req.query?.purge === 'true' || req.query?.permanent === 'true');

  // Authorization: Only Branch Manager or Super Admin can delete documents
  const canDelete =
    req.user?.role === ROLES.SUPER_ADMIN || req.user?.role === ROLES.BRANCH_MANAGER;

  if (!canDelete) {
    throw new ApiError(403, 'Only Branch Manager or Super Admin can delete documents from vault');
  }

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(docId)) {
    throw new ApiError(400, 'Invalid ID format');
  }

  const student = await Student.findOne({ _id: id, isDeleted: false });
  if (!student) {
    throw new ApiError(404, 'Student profile not found');
  }

  // Branch isolation
  if (
    req.user?.role !== ROLES.SUPER_ADMIN &&
    req.branchScope !== 'all' &&
    student.branch !== req.user?.branch
  ) {
    throw new ApiError(403, 'Unauthorized to delete documents for student outside your assigned branch');
  }

  const document = await Document.findOne({
    _id: docId,
    student: student._id,
    isDeleted: false,
  });

  if (!document) {
    throw new ApiError(404, 'Document record not found');
  }

  // Purge from Cloudflare R2 object storage immediately
  if (document.storageKey) {
    await deleteObject(document.storageKey);
  }

  if (isPurge) {
    await Document.deleteOne({ _id: docId });
  } else {
    document.isDeleted = true;
    document.deletedAt = new Date();
    document.deletedBy = req.user._id;
    await document.save();
  }

  // Audit event
  await DocumentAudit.create({
    document: document._id,
    student: student._id,
    studentIdCode: student.studentId,
    branch: student.branch,
    action: isPurge ? 'DOCUMENT_PURGED_R2' : 'DOCUMENT_SOFT_DELETED',
    actor: req.user._id,
    actorName: req.user.name || 'Staff',
    actorRole: req.user.role || '',
    details: {
      documentId: document._id,
      category: document.category,
      fileName: document.fileName,
      storageKey: document.storageKey,
      r2Purged: true,
    },
  });

  // Re-sync checklist gate
  const gateComplete = await syncPipelineDocumentGate(student);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        deletedDocId: document._id,
        isChecklistComplete: gateComplete,
        r2Purged: true,
      },
      'Document deleted and purged from Cloudflare R2 successfully'
    )
  );
});

/**
 * 10. Permanent Purge Endpoint
 * DELETE /api/v1/students/:id/vault/:docId/permanent
 */
const permanentDeleteDocument = asyncHandler(async (req, res) => {
  req.query.purge = 'true';
  return softDeleteDocument(req, res);
});

module.exports = {
  createUploadIntent,
  uploadDocument,
  updateDocument,
  getStudentDocuments,
  getDownloadUrl,
  getPreviewUrl,
  serveStorageFile,
  verifyDocument,
  softDeleteDocument,
  permanentDeleteDocument,
  MANDATORY_GATE_CATEGORIES,
};
