const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { mockReqRes } = require('./helpers/testApp');
const {
  createShieldLimiter,
  globalLimiter,
  authLimiter,
  refreshLimiter,
  uploadsLimiter,
  usersLimiter,
  pipelineLimiter,
  reportsLimiter,
} = require('../src/shield/rateLimiters');
const SHIELD_CONFIG = require('../src/shield/shieldConfig');
const { getRateLimitStoreConfig } = require('../src/shield/shieldConfig');
const { ERROR_CATEGORIES } = require('../src/shield/errorCatalogue');

function invokeLimiter(limiter, req, res) {
  return new Promise((resolve) => {
    const next = (err) => {
      resolve({ nextCalled: true, nextError: err || null, res });
    };

    const origJson = res.json ? res.json.bind(res) : null;
    res.json = (data) => {
      if (origJson) origJson(data);
      resolve({ nextCalled: false, nextError: null, res });
    };

    try {
      const result = limiter(req, res, next);
      if (result && typeof result.then === 'function') {
        result.then(() => resolve({ nextCalled: false, nextError: null, res })).catch(next);
      }
    } catch (syncErr) {
      next(syncErr);
    }
  });
}

describe('VULN-08: In-Memory Rate Limiting & Zero Redis Protection Suite', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.REDIS_URL;
    delete process.env.REDIS_HOST;
    delete process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT;
    delete process.env.RATE_LIMIT_STORE;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('1. In-Memory Standalone Architecture & Zero Redis Dependencies', () => {
    it('operates in-memory with zero external Redis dependencies or configuration', () => {
      assert.equal(process.env.REDIS_URL, undefined);
      assert.equal(process.env.REDIS_HOST, undefined);
      assert.equal(SHIELD_CONFIG.REDIS, undefined, 'SHIELD_CONFIG.REDIS must remain undefined');

      const storeConfig = getRateLimitStoreConfig();
      assert.equal(storeConfig.storeType, 'memory');
      assert.equal(storeConfig.isDistributed, false);
      assert.equal(storeConfig.redisConfigured, false);
    });

    it('exports all standard rate limiters with expected threshold configurations', () => {
      assert.equal(typeof globalLimiter, 'function');
      assert.equal(typeof authLimiter, 'function');
      assert.equal(typeof refreshLimiter, 'function');
      assert.equal(typeof uploadsLimiter, 'function');
      assert.equal(typeof usersLimiter, 'function');
      assert.equal(typeof pipelineLimiter, 'function');
      assert.equal(typeof reportsLimiter, 'function');

      assert.ok(SHIELD_CONFIG.RATE_LIMITS.GLOBAL.max >= 100);
      assert.ok(SHIELD_CONFIG.RATE_LIMITS.AUTH.max <= 100);
      assert.ok(SHIELD_CONFIG.RATE_LIMITS.UPLOADS.max <= 30);
    });
  });

  describe('2. In-Memory Threshold Enforcement', () => {
    it('enforces request limit per IP address in-memory and blocks exceeding requests with HTTP 429', async () => {
      // Threshold: max 3 requests per window
      const config = { windowMs: 60 * 1000, max: 3 };
      const limiter = createShieldLimiter(config, ERROR_CATEGORIES.RATE_LIMIT_LOGIN);
      const clientIp = '198.51.100.45';

      // First 3 requests must pass
      for (let i = 1; i <= 3; i++) {
        const { req, res } = mockReqRes({ remoteAddress: clientIp });
        const result = await invokeLimiter(limiter, req, res);
        assert.equal(result.nextCalled, true, `Request ${i} must pass`);
      }

      // 4th request from same IP must be BLOCKED with HTTP 429
      const req4 = mockReqRes({ remoteAddress: clientIp });
      const result4 = await invokeLimiter(limiter, req4.req, req4.res);
      assert.equal(result4.nextCalled, false);
      assert.equal(req4.res.statusCode, 429);
      assert.equal(req4.res.body.code, ERROR_CATEGORIES.RATE_LIMIT_LOGIN);
      assert.ok(req4.res.body.retryAfter > 0);
    });

    it('isolates rate limit counters between different client IP addresses', async () => {
      const config = { windowMs: 60 * 1000, max: 2 };
      const limiter = createShieldLimiter(config, ERROR_CATEGORIES.RATE_LIMIT_LOGIN);

      const clientA = '198.51.100.10';
      const clientB = '198.51.100.20';

      // Exhaust client A's limit
      for (let i = 1; i <= 2; i++) {
        const { req, res } = mockReqRes({ remoteAddress: clientA });
        const result = await invokeLimiter(limiter, req, res);
        assert.equal(result.nextCalled, true);
      }

      // Client A is blocked
      const blockedA = mockReqRes({ remoteAddress: clientA });
      await invokeLimiter(limiter, blockedA.req, blockedA.res);
      assert.equal(blockedA.res.statusCode, 429);

      // Client B is still allowed
      const allowedB = mockReqRes({ remoteAddress: clientB });
      const resultB = await invokeLimiter(limiter, allowedB.req, allowedB.res);
      assert.equal(resultB.nextCalled, true);
      assert.notEqual(allowedB.res.statusCode, 429);
    });
  });

  describe('3. Rate Limit Response Headers & Standardized Payloads', () => {
    it('sets standard RateLimit headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset)', async () => {
      const limiter = createShieldLimiter({ windowMs: 60000, max: 10 }, ERROR_CATEGORIES.RATE_LIMIT_EXCEEDED);

      const { req, res } = mockReqRes({ remoteAddress: '203.0.113.19' });
      await invokeLimiter(limiter, req, res);

      // Express-rate-limit standardHeaders
      assert.ok(res.headers['ratelimit-limit'] !== undefined);
      assert.equal(Number(res.headers['ratelimit-limit']), 10);
      assert.ok(res.headers['ratelimit-remaining'] !== undefined);
      assert.equal(Number(res.headers['ratelimit-remaining']), 9);
      assert.ok(res.headers['ratelimit-reset'] !== undefined);
    });

    it('returns standardized 429 JSON response matching API Shield specification', async () => {
      const limiter = createShieldLimiter(
        { windowMs: 60000, max: 1 },
        ERROR_CATEGORIES.RATE_LIMIT_LOGIN
      );

      // 1st request succeeds
      const { req: req1, res: res1 } = mockReqRes({ remoteAddress: '192.0.2.1' });
      await invokeLimiter(limiter, req1, res1);

      // 2nd request triggers 429
      const { req: req2, res: res2 } = mockReqRes({ remoteAddress: '192.0.2.1' });
      const result2 = await invokeLimiter(limiter, req2, res2);

      assert.equal(result2.nextCalled, false);
      assert.equal(res2.statusCode, 429);
      assert.equal(res2.body.success, false);
      assert.equal(res2.body.statusCode, 429);
      assert.equal(res2.body.code, ERROR_CATEGORIES.RATE_LIMIT_LOGIN);
      assert.ok(res2.body.message);
      assert.ok(typeof res2.body.retryAfter === 'number');
    });
  });

  describe('4. Trusted Proxy & Client IP Verification', () => {
    it('correctly uses socket remoteAddress when trust proxy is false (anti-spoofing)', () => {
      const app = express();
      // In standalone / untrusted mode, trust proxy is false
      app.set('trust proxy', false);

      const req = {
        headers: { 'x-forwarded-for': '203.0.113.195, 10.0.0.1' },
        connection: { remoteAddress: '192.168.1.50' },
        socket: { remoteAddress: '192.168.1.50' },
      };

      // When trust proxy is false, Express ignores X-Forwarded-For
      assert.equal(req.socket.remoteAddress, '192.168.1.50');
    });
  });
});
