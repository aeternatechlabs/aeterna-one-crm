/**
 * File & MIME Validation Engine with Magic Byte Signature Verification
 * Prevents file spoofing, path traversal, and oversized payloads.
 */

const path = require('path');

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

const ALLOWED_DOCUMENT_CATEGORIES = new Set([
  'passport_identity',
  'academic_transcripts',
  'test_score_cards',
  'financial_affidavits',
  'sop_lor',
  'visa_documents',
  'other',
]);

const ALLOWED_MIME_TYPES = new Map([
  ['application/pdf', ['.pdf']],
  ['image/jpeg', ['.jpg', '.jpeg']],
  ['image/png', ['.png']],
  ['image/webp', ['.webp']],
]);

/**
 * Validates declared file metadata before upload
 * @param {Object} metadata - { fileName, fileSize, mimeType, category }
 * @returns {{ valid: boolean, error?: string }}
 */
function validateFileMetadata({ fileName, fileSize, mimeType, category }) {
  if (!fileName || typeof fileName !== 'string') {
    return { valid: false, error: 'File name is required' };
  }

  // Path traversal prevention
  const sanitizedBase = path.basename(fileName);
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\') || sanitizedBase !== fileName) {
    return { valid: false, error: 'Invalid file name. Path traversal characters not permitted' };
  }

  const ext = path.extname(fileName).toLowerCase();
  if (!ext) {
    return { valid: false, error: 'File extension is required' };
  }

  if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) {
    return {
      valid: false,
      error: `Unsupported MIME type "${mimeType}". Allowed: application/pdf, image/jpeg, image/png, image/webp`,
    };
  }

  const allowedExts = ALLOWED_MIME_TYPES.get(mimeType);
  if (!allowedExts.includes(ext)) {
    return {
      valid: false,
      error: `File extension "${ext}" does not match declared MIME type "${mimeType}"`,
    };
  }

  if (fileSize !== undefined && fileSize !== null) {
    const size = Number(fileSize);
    if (isNaN(size) || size <= 0) {
      return { valid: false, error: 'File size must be a positive number' };
    }
    if (size > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `File size exceeds the maximum limit of 10MB (${(size / (1024 * 1024)).toFixed(2)}MB provided)`,
      };
    }
  }

  if (category && !ALLOWED_DOCUMENT_CATEGORIES.has(category)) {
    return {
      valid: false,
      error: `Invalid document category "${category}". Allowed: ${Array.from(ALLOWED_DOCUMENT_CATEGORIES).join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Verifies magic bytes signatures of file binary buffer
 * @param {Buffer} buffer - Binary file buffer
 * @param {string} declaredMimeType - MIME type declared in headers
 * @returns {{ valid: boolean, detectedMime?: string, error?: string }}
 */
function verifyFileMagicBytes(buffer, declaredMimeType) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
    return { valid: false, error: 'Invalid file buffer or insufficient bytes for signature verification' };
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'File buffer exceeds the maximum limit of 10MB' };
  }

  // 1. PDF: %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
  if (
    buffer.length >= 5 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    if (declaredMimeType && declaredMimeType !== 'application/pdf') {
      return {
        valid: false,
        detectedMime: 'application/pdf',
        error: `MIME spoofing detected: file binary is PDF but declared as "${declaredMimeType}"`,
      };
    }
    return { valid: true, detectedMime: 'application/pdf' };
  }

  // 2. JPEG: 0xFF, 0xD8, 0xFF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    if (declaredMimeType && declaredMimeType !== 'image/jpeg') {
      return {
        valid: false,
        detectedMime: 'image/jpeg',
        error: `MIME spoofing detected: file binary is JPEG but declared as "${declaredMimeType}"`,
      };
    }
    return { valid: true, detectedMime: 'image/jpeg' };
  }

  // 3. PNG: 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    if (declaredMimeType && declaredMimeType !== 'image/png') {
      return {
        valid: false,
        detectedMime: 'image/png',
        error: `MIME spoofing detected: file binary is PNG but declared as "${declaredMimeType}"`,
      };
    }
    return { valid: true, detectedMime: 'image/png' };
  }

  // 4. WEBP: RIFF....WEBP (0x52, 0x49, 0x46, 0x46 ... 0x57, 0x45, 0x42, 0x50)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    if (declaredMimeType && declaredMimeType !== 'image/webp') {
      return {
        valid: false,
        detectedMime: 'image/webp',
        error: `MIME spoofing detected: file binary is WEBP but declared as "${declaredMimeType}"`,
      };
    }
    return { valid: true, detectedMime: 'image/webp' };
  }

  return {
    valid: false,
    error: 'Unrecognized or corrupt binary file signature. Only PDF, JPEG, PNG, and WEBP are accepted',
  };
}

module.exports = {
  MAX_FILE_SIZE_BYTES,
  ALLOWED_DOCUMENT_CATEGORIES,
  ALLOWED_MIME_TYPES,
  validateFileMetadata,
  verifyFileMagicBytes,
};
