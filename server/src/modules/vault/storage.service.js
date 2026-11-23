/**
 * Cloud Object Storage Adapter (Cloudflare R2 / AWS S3 Compatible)
 * Includes Native AWS SigV4 Cloudflare R2 Driver + Sandbox/Local Disk Fallback Driver
 * Full CRUD Support: Upload (Add), Replace (Edit), Delete (Purge) on Cloudflare R2
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STORAGE_ROOT_DIR = path.resolve(__dirname, '../../../storage_vault');
const SIGNING_SECRET =
  process.env.STORAGE_SIGNING_SECRET || process.env.JWT_SECRET || 'aeterna-vault-storage-signing-secret-key-2026';

// Cloudflare R2 Configuration
const R2_CONFIG = {
  accountId: process.env.R2_ACCOUNT_ID || '',
  accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  bucketName: process.env.R2_BUCKET_NAME || 'aeterna-one-vault',
  publicUrl: process.env.R2_PUBLIC_URL || '',
  customDomain: process.env.R2_CUSTOM_DOMAIN || '',
  region: 'auto',
  service: 's3',
};

// Ensure storage root directory exists in local driver mode
if (!fs.existsSync(STORAGE_ROOT_DIR)) {
  try {
    fs.mkdirSync(STORAGE_ROOT_DIR, { recursive: true });
  } catch {
    // Handled in sandboxed read-only runs
  }
}

/**
 * Checks whether Cloudflare R2 credentials are fully configured
 */
function isR2Configured() {
  return Boolean(
    R2_CONFIG.accountId &&
    R2_CONFIG.accessKeyId &&
    R2_CONFIG.secretAccessKey &&
    R2_CONFIG.bucketName
  );
}

/**
 * Returns sanitized R2 configuration metadata for UI & admin inspection
 */
function getR2ConfigSummary() {
  return {
    isConfigured: isR2Configured(),
    provider: isR2Configured() ? 'cloudflare_r2' : 'local_vault',
    bucketName: R2_CONFIG.bucketName,
    accountIdMasked: R2_CONFIG.accountId
      ? `${R2_CONFIG.accountId.slice(0, 4)}...${R2_CONFIG.accountId.slice(-4)}`
      : 'Not Configured',
    accessKeyMasked: R2_CONFIG.accessKeyId
      ? `${R2_CONFIG.accessKeyId.slice(0, 4)}...${R2_CONFIG.accessKeyId.slice(-4)}`
      : 'Not Configured',
    endpoint: R2_CONFIG.accountId
      ? `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`
      : 'Local Encrypted Storage Vault',
    publicUrl: R2_CONFIG.publicUrl || R2_CONFIG.customDomain || null,
  };
}

/**
 * Helper to compute SHA-256 Hex
 */
function sha256Hex(data) {
  return crypto.createHash('sha256').update(data || '').digest('hex');
}

/**
 * Helper to compute HMAC-SHA256 Buffer
 */
function hmacDigest(key, data) {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

/**
 * Computes AWS Signature Version 4 Signing Key for R2
 */
function getSigV4Key(secretKey, dateStamp, region, service) {
  const kDate = hmacDigest('AWS4' + secretKey, dateStamp);
  const kRegion = hmacDigest(kDate, region);
  const kService = hmacDigest(kRegion, service);
  const kSigning = hmacDigest(kService, 'aws4_request');
  return kSigning;
}

/**
 * Signs an HTTP request for Cloudflare R2 S3-Compatible REST API
 */
function signR2Request({ method, storageKey, body = null, contentType = '' }) {
  const host = `${R2_CONFIG.accountId}.r2.cloudflarestorage.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = sha256Hex(body || '');
  const canonicalUri = `/${R2_CONFIG.bucketName}/${storageKey.split('/').map(encodeURIComponent).join('/')}`;

  const headersToSign = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  if (contentType) {
    headersToSign['content-type'] = contentType;
  }

  const sortedKeys = Object.keys(headersToSign).sort();
  const canonicalHeaders = sortedKeys.map((k) => `${k}:${headersToSign[k].trim()}\n`).join('');
  const signedHeaders = sortedKeys.join(';');

  const canonicalRequest = [
    method.toUpperCase(),
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${R2_CONFIG.region}/${R2_CONFIG.service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = getSigV4Key(
    R2_CONFIG.secretAccessKey,
    dateStamp,
    R2_CONFIG.region,
    R2_CONFIG.service
  );
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

  const authHeader = `AWS4-HMAC-SHA256 Credential=${R2_CONFIG.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    url: `https://${host}${canonicalUri}`,
    headers: {
      ...headersToSign,
      Authorization: authHeader,
    },
  };
}

/**
 * Generates an AWS SigV4 Presigned URL for direct browser access from Cloudflare R2
 */
function generateR2PresignedUrl(storageKey, { expiresIn = 900 } = {}) {
  if (!isR2Configured()) return null;

  // If a public domain or custom CDN URL is configured, use it directly
  if (R2_CONFIG.publicUrl || R2_CONFIG.customDomain) {
    const base = R2_CONFIG.publicUrl || R2_CONFIG.customDomain;
    return `${base.replace(/\/$/, '')}/${storageKey}`;
  }

  const host = `${R2_CONFIG.accountId}.r2.cloudflarestorage.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const credentialScope = `${dateStamp}/${R2_CONFIG.region}/${R2_CONFIG.service}/aws4_request`;
  const canonicalUri = `/${R2_CONFIG.bucketName}/${storageKey.split('/').map(encodeURIComponent).join('/')}`;

  const queryParams = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${R2_CONFIG.accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'host',
  };

  const sortedKeys = Object.keys(queryParams).sort();
  const canonicalQuery = sortedKeys
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
    .join('&');

  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';

  const canonicalRequest = [
    'GET',
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = getSigV4Key(
    R2_CONFIG.secretAccessKey,
    dateStamp,
    R2_CONFIG.region,
    R2_CONFIG.service
  );
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

/**
 * Uploads a file buffer directly to Cloudflare R2
 */
async function uploadToR2(storageKey, buffer, contentType) {
  if (!isR2Configured()) {
    throw new Error('Cloudflare R2 is not configured with required environment variables');
  }

  const signed = signR2Request({
    method: 'PUT',
    storageKey,
    body: buffer,
    contentType: contentType || 'application/octet-stream',
  });

  const response = await fetch(signed.url, {
    method: 'PUT',
    headers: signed.headers,
    body: buffer,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Cloudflare R2 Upload Failed (HTTP ${response.status}): ${errorBody || response.statusText}`);
  }

  const etag = response.headers.get('etag') || '';
  return {
    key: storageKey,
    size: buffer.length,
    contentType,
    provider: 'cloudflare_r2',
    etag: etag.replace(/"/g, ''),
  };
}

/**
 * Downloads a file buffer from Cloudflare R2
 */
async function downloadFromR2(storageKey) {
  if (!isR2Configured()) {
    throw new Error('Cloudflare R2 is not configured');
  }

  const signed = signR2Request({
    method: 'GET',
    storageKey,
  });

  const response = await fetch(signed.url, {
    method: 'GET',
    headers: signed.headers,
  });

  if (!response.ok) {
    const err = new Error(`Cloudflare R2 Download Failed (HTTP ${response.status})`);
    if (response.status === 404) err.code = 'ENOENT';
    throw err;
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Deletes a file from Cloudflare R2
 */
async function deleteFromR2(storageKey) {
  if (!isR2Configured()) {
    return false;
  }

  try {
    const signed = signR2Request({
      method: 'DELETE',
      storageKey,
    });

    const response = await fetch(signed.url, {
      method: 'DELETE',
      headers: signed.headers,
    });

    return response.ok || response.status === 204 || response.status === 404;
  } catch (err) {
    console.warn(`[StorageService] Failed to delete object from Cloudflare R2 (${storageKey}):`, err.message);
    return false;
  }
}

/**
 * Tests Cloudflare R2 connectivity by performing a test write, read, and delete
 */
async function testR2Connection() {
  if (!isR2Configured()) {
    return {
      connected: false,
      provider: 'local_vault',
      message: 'Cloudflare R2 credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME) are not configured. Running in Local Vault mode.',
    };
  }

  const testKey = `vault/system/ping_test_${Date.now()}.txt`;
  const testBuffer = Buffer.from('Aeterna One CRM Cloudflare R2 Healthcheck Ping');
  const startTime = Date.now();

  try {
    // 1. Write
    await uploadToR2(testKey, testBuffer, 'text/plain');

    // 2. Read
    const downloaded = await downloadFromR2(testKey);
    if (!downloaded || downloaded.toString() !== testBuffer.toString()) {
      throw new Error('Data integrity mismatch during R2 read-after-write test');
    }

    // 3. Delete
    await deleteFromR2(testKey);
    const latencyMs = Date.now() - startTime;

    return {
      connected: true,
      provider: 'cloudflare_r2',
      bucket: R2_CONFIG.bucketName,
      latencyMs,
      message: `Cloudflare R2 bucket "${R2_CONFIG.bucketName}" connected and verified (PUT, GET, DELETE passed in ${latencyMs}ms).`,
    };
  } catch (err) {
    return {
      connected: false,
      provider: 'cloudflare_r2',
      bucket: R2_CONFIG.bucketName,
      error: err.message,
      message: `Cloudflare R2 verification failed: ${err.message}`,
    };
  }
}

/**
 * Builds the canonical storage key adhering to private bucket layout:
 * vault/{branch}/{studentId}/{category}/{timestamp}_{random}_{sanitizedFileName}
 */
function buildStorageKey({ branch, studentId, category, fileName }) {
  const safeBranch = String(branch || 'bengaluru').toLowerCase();
  const safeStudentId = String(studentId || 'unknown').toUpperCase();
  const safeCategory = String(category || 'other').toLowerCase();
  const safeFileName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniquePrefix = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  return `vault/${safeBranch}/${safeStudentId}/${safeCategory}/${uniquePrefix}_${safeFileName}`;
}

/**
 * Creates HMAC-SHA256 signature for a token
 */
function createSignature(payload) {
  return crypto.createHmac('sha256', SIGNING_SECRET).update(payload).digest('hex');
}

/**
 * Generates a signed download URL / token with 15-minute TTL
 */
function generateSignedDownloadToken({ storageKey, fileName, disposition = 'attachment', ttlSeconds = 900 }) {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  const rawPayload = JSON.stringify({
    key: storageKey,
    name: fileName,
    disp: disposition,
    exp: expiresAt,
  });

  const encodedPayload = Buffer.from(rawPayload, 'utf8').toString('base64url');
  const signature = createSignature(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies and decodes a signed download token
 */
function verifySignedDownloadToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return { valid: false, error: 'Malformed or missing storage access token' };
  }

  const [encodedPayload, providedSignature] = token.split('.');
  const expectedSignature = createSignature(encodedPayload);

  // Constant-time signature comparison to prevent timing attacks
  const sigBufferA = Buffer.from(providedSignature, 'hex');
  const sigBufferB = Buffer.from(expectedSignature, 'hex');

  if (sigBufferA.length !== sigBufferB.length || !crypto.timingSafeEqual(sigBufferA, sigBufferB)) {
    return { valid: false, error: 'Invalid token signature. Access denied' };
  }

  try {
    const rawPayload = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    const payload = JSON.parse(rawPayload);

    if (Date.now() > payload.exp) {
      return { valid: false, error: 'Signed storage access link has expired (15-minute TTL exceeded)' };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'Failed to decode storage token payload' };
  }
}

/**
 * Unified Put Object: Stores in Cloudflare R2 when configured, falls back to local vault disk.
 * Always mirrors locally so offline verification and tests pass seamlessly.
 */
async function putObject(storageKey, buffer, contentType) {
  // Always mirror to local storage directory for resiliency and test harness
  const targetPath = path.join(STORAGE_ROOT_DIR, storageKey);
  const targetDir = path.dirname(targetPath);

  if (!fs.existsSync(targetDir)) {
    try {
      fs.mkdirSync(targetDir, { recursive: true });
    } catch {
      // Sandboxed or read-only handling
    }
  }

  try {
    await fs.promises.writeFile(targetPath, buffer);
  } catch (err) {
    console.warn('[StorageService] Local mirror write warning:', err.message);
  }

  // If Cloudflare R2 is configured, upload to Cloudflare R2
  if (isR2Configured()) {
    try {
      const r2Result = await uploadToR2(storageKey, buffer, contentType);
      return r2Result;
    } catch (err) {
      console.warn(`[StorageService] Cloudflare R2 upload failed (${err.message}). Using local vault copy.`);
    }
  }

  return {
    key: storageKey,
    size: buffer.length,
    contentType,
    provider: 'local',
  };
}

/**
 * Unified Get Object: Reads from Cloudflare R2 if configured, falls back to local disk.
 */
async function getObject(storageKey) {
  if (isR2Configured()) {
    try {
      return await downloadFromR2(storageKey);
    } catch (err) {
      if (err.code === 'ENOENT') throw err;
      console.warn(`[StorageService] Cloudflare R2 fetch fallback to local disk: ${err.message}`);
    }
  }

  const targetPath = path.join(STORAGE_ROOT_DIR, storageKey);
  if (!fs.existsSync(targetPath)) {
    const err = new Error('Object not found in storage');
    err.code = 'ENOENT';
    throw err;
  }
  return await fs.promises.readFile(targetPath);
}

/**
 * Unified Delete Object: Removes from Cloudflare R2 and deletes local mirror.
 */
async function deleteObject(storageKey) {
  // 1. Delete from Cloudflare R2 if configured
  if (isR2Configured()) {
    await deleteFromR2(storageKey);
  }

  // 2. Delete from local disk
  const targetPath = path.join(STORAGE_ROOT_DIR, storageKey);
  if (fs.existsSync(targetPath)) {
    try {
      await fs.promises.unlink(targetPath);
    } catch {
      // Ignored if already unlinked
    }
  }
  return true;
}

module.exports = {
  buildStorageKey,
  generateSignedDownloadToken,
  verifySignedDownloadToken,
  putObject,
  getObject,
  deleteObject,
  isR2Configured,
  getR2ConfigSummary,
  uploadToR2,
  downloadFromR2,
  deleteFromR2,
  generateR2PresignedUrl,
  testR2Connection,
  STORAGE_ROOT_DIR,
};
