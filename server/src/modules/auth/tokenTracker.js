/**
 * Aeterna One — Refresh Token Rotation & Reuse Tracker (SEC-VULN-10)
 *
 * Implements single-use refresh token rotation with a safety grace window for concurrent requests.
 * Detects token replay attacks and invalidates compromised sessions.
 */

const rotatedTokens = new Map();

// Default 30-second grace window to safely absorb concurrent browser requests and network races
const DEFAULT_GRACE_PERIOD_MS = 30000;

/**
 * Checks whether a refresh token has already been rotated.
 * @param {string} tokenKey - Unique token identifier (tokenId or SHA-256 hash)
 * @returns {{ isRotated: boolean, isConcurrentReplay?: boolean, isReused?: boolean, tokens?: Object, userId?: string }}
 */
function checkRotatedTokenReuse(tokenKey) {
  if (!tokenKey) return { isRotated: false };

  const record = rotatedTokens.get(tokenKey);
  if (!record) {
    return { isRotated: false };
  }

  const graceWindowMs =
    process.env.REFRESH_GRACE_PERIOD_MS !== undefined
      ? Number(process.env.REFRESH_GRACE_PERIOD_MS)
      : DEFAULT_GRACE_PERIOD_MS;

  const elapsed = Date.now() - record.rotatedAt;

  if (elapsed <= graceWindowMs) {
    // Within grace window: safe concurrent request
    return {
      isRotated: true,
      isConcurrentReplay: true,
      tokens: record.tokens,
      userId: record.userId,
    };
  }

  // Outside grace window: malicious reuse attempt!
  return {
    isRotated: true,
    isReused: true,
    userId: record.userId,
  };
}

/**
 * Records a refresh token as rotated.
 * @param {string} tokenKey
 * @param {Object} data - { userId, rotatedAt, sessionCreatedAt, tokens }
 */
function recordRotatedToken(tokenKey, data) {
  if (!tokenKey) return;

  rotatedTokens.set(tokenKey, {
    ...data,
    rotatedAt: data.rotatedAt || Date.now(),
  });

  // Prune expired entries if map grows large (older than 7 days)
  if (rotatedTokens.size > 5000) {
    pruneExpiredRotatedTokens();
  }
}

/**
 * Prunes rotated tokens older than 7 days to prevent unbounded memory growth.
 */
function pruneExpiredRotatedTokens() {
  const maxRetentionMs = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  for (const [key, val] of rotatedTokens.entries()) {
    if (now - val.rotatedAt > maxRetentionMs) {
      rotatedTokens.delete(key);
    }
  }
}

/**
 * Clears the rotated token store (used in isolated unit/integration tests).
 */
function clearRotatedTokensForTesting() {
  rotatedTokens.clear();
}

module.exports = {
  checkRotatedTokenReuse,
  recordRotatedToken,
  clearRotatedTokensForTesting,
  pruneExpiredRotatedTokens,
  DEFAULT_GRACE_PERIOD_MS,
};
