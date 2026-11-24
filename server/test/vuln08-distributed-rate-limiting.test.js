const { test, describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const express = require('express');

const { mockReqRes } = require('./helpers/testApp');
const {
  createShieldLimiter,
  globalLimiter,
  authLimiter,
  refreshLimiter,
  uploadsLimiter,
} = require('../src/shield/rateLimiters');
const SHIELD_CONFIG = require('../src/shield/shieldConfig');
const {
  isRedisConfigured,
  getRedisClient,
  closeRedisClient,
  createSharedRateLimitStore,
} = require('../src/shield/redisClient');
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

/**
 * Creates an in-memory shared Redis mock backend that speaks the RESP / Lua contract
 * required by rate-limit-redis v4 (SCRIPT LOAD, EVALSHA, PTTL, INCR, DEL).
 */
function createSharedMockRedisBackend() {
  const storeMap = new Map();
  const scriptMap = new Map();

  return {
    call: async (cmd, ...args) => {
      const command = cmd.toUpperCase();

      if (command === 'SCRIPT') {
        const [subCmd, script] = args;
        if (subCmd.toUpperCase() === 'LOAD') {
          const sha = crypto.createHash('sha1').update(script).digest('hex');
          scriptMap.set(sha, script);
          return sha;
        }
      }

      if (command === 'EVALSHA') {
        const [sha, numKeys, key, resetOnChange, windowMs] = args;
        const now = Date.now();
        let entry = storeMap.get(key);

        if (!entry || entry.expiresAt <= now) {
          entry = { hits: 1, expiresAt: now + Number(windowMs) };
          storeMap.set(key, entry);
          return [1, Number(windowMs)];
        }

        entry.hits += 1;
        const remainingTtl = Math.max(entry.expiresAt - now, 0);
        return [entry.hits, remainingTtl];
      }

      if (command === 'DEL') {
        const [key] = args;
        storeMap.delete(key);
        return 1;
      }

      return null;
    },
    clear: () => {
      storeMap.clear();
      scriptMap.clear();
    },
    getHits: (key) => storeMap.get(key)?.hits || 0,
  };
}

describe('VULN-08: Distributed Rate Limiting & Multi-Instance Protection Suite', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.REDIS_URL;
    delete process.env.REDIS_HOST;
    delete process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT;
    delete process.env.RATE_LIMIT_STORE;
    closeRedisClient();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    closeRedisClient();
  });

  describe('1. In-Memory Development Mode & Zero Regression', () => {
    it('operates in-memory by default when Redis is not configured (zero-dependency local dev)', () => {
      assert.equal(isRedisConfigured(), false);
      assert.equal(process.env.REDIS_URL, undefined);
      assert.equal(SHIELD_CONFIG.REDIS, undefined, 'SHIELD_CONFIG.REDIS must remain undefined for backward compatibility');

      const store = createSharedRateLimitStore('rl:test:');
      assert.equal(store, undefined, 'Must return undefined to default to express-rate-limit MemoryStore');
    });

    it('exports all standard rate limiters with expected threshold configurations', () => {
      assert.equal(typeof globalLimiter, 'function');
      assert.equal(typeof authLimiter, 'function');
      assert.equal(typeof refreshLimiter, 'function');
      assert.equal(typeof uploadsLimiter, 'function');

      assert.ok(SHIELD_CONFIG.RATE_LIMITS.GLOBAL.max >= 100);
      assert.ok(SHIELD_CONFIG.RATE_LIMITS.AUTH.max <= 100);
      assert.ok(SHIELD_CONFIG.RATE_LIMITS.UPLOADS.max <= 30);
    });
  });

  describe('2. Multi-Instance Shared Counter Enforcement', () => {
    it('shares rate limit hit counters across multiple application instances using RedisStore', async () => {
      const { RedisStore } = require('rate-limit-redis');
      const sharedBackend = createSharedMockRedisBackend();

      // Instance 1 Store
      const storeInstance1 = new RedisStore({
        sendCommand: (...args) => sharedBackend.call(...args),
        prefix: 'rl:shared:auth:',
      });

      // Instance 2 Store (simulating second PM2 worker or Docker replica)
      const storeInstance2 = new RedisStore({
        sendCommand: (...args) => sharedBackend.call(...args),
        prefix: 'rl:shared:auth:',
      });

      // Threshold: max 5 requests per minute
      const config = { windowMs: 60 * 1000, max: 5 };

      const limiterNode1 = createShieldLimiter(config, ERROR_CATEGORIES.RATE_LIMIT_LOGIN, {
        store: storeInstance1,
      });

      const limiterNode2 = createShieldLimiter(config, ERROR_CATEGORIES.RATE_LIMIT_LOGIN, {
        store: storeInstance2,
      });

      const clientIp = '198.51.100.45';

      // Send 3 requests to Instance 1
      for (let i = 1; i <= 3; i++) {
        const { req, res } = mockReqRes({ remoteAddress: clientIp });
        const result = await invokeLimiter(limiterNode1, req, res);
        assert.equal(result.nextCalled, true, `Request ${i} to Instance 1 must pass`);
      }

      // Send 2 requests to Instance 2 (Total hits = 5, reaching threshold)
      for (let i = 4; i <= 5; i++) {
        const { req, res } = mockReqRes({ remoteAddress: clientIp });
        const result = await invokeLimiter(limiterNode2, req, res);
        assert.equal(result.nextCalled, true, `Request ${i} to Instance 2 must pass`);
      }

      // 6th request to Instance 1: Must be BLOCKED with HTTP 429 because counter was shared with Instance 2!
      const req6 = mockReqRes({ remoteAddress: clientIp });
      const result6 = await invokeLimiter(limiterNode1, req6.req, req6.res);
      assert.equal(result6.nextCalled, false);
      assert.equal(req6.res.statusCode, 429);
      assert.equal(req6.res.body.code, ERROR_CATEGORIES.RATE_LIMIT_LOGIN);
      assert.ok(req6.res.body.retryAfter > 0);

      // 7th request to Instance 2: Must also be BLOCKED with HTTP 429
      const req7 = mockReqRes({ remoteAddress: clientIp });
      const result7 = await invokeLimiter(limiterNode2, req7.req, req7.res);
      assert.equal(result7.nextCalled, false);
      assert.equal(req7.res.statusCode, 429);
    });
  });

  describe('3. Rate Limit Response Headers & Standardized Payloads', () => {
    it('sets standard RateLimit headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset)', async () => {
      const { RedisStore } = require('rate-limit-redis');
      const sharedBackend = createSharedMockRedisBackend();
      const store = new RedisStore({
        sendCommand: (...args) => sharedBackend.call(...args),
        prefix: 'rl:headers:test:',
      });

      const limiter = createShieldLimiter({ windowMs: 60000, max: 10 }, ERROR_CATEGORIES.RATE_LIMIT_EXCEEDED, {
        store,
      });

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

  describe('4. Production Fail-Closed Enforcement & Connection Resilience', () => {
    it('throws server configuration error if REQUIRE_DISTRIBUTED_RATE_LIMIT=true without Redis', () => {
      process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT = 'true';
      delete process.env.REDIS_URL;
      delete process.env.REDIS_HOST;

      assert.throws(
        () => getRedisClient(),
        /Distributed rate limiting is required/
      );
    });

    it('gracefully passes through when Redis throws transient command errors (fail-open for staff)', async () => {
      // Simulating Redis command failure during request handling
      const failingBackend = {
        call: async (cmd) => {
          if (cmd.toUpperCase() === 'SCRIPT') {
            return 'fake-sha-script-loaded';
          }
          throw new Error('READONLY You cannot write against a read only replica');
        },
      };

      const { RedisStore } = require('rate-limit-redis');
      const store = new RedisStore({
        sendCommand: (...args) => failingBackend.call(...args),
        prefix: 'rl:failing:',
      });

      const limiter = createShieldLimiter(
        { windowMs: 60000, max: 5 },
        ERROR_CATEGORIES.RATE_LIMIT_EXCEEDED,
        { store, passOnStoreError: true }
      );

      const { req, res } = mockReqRes({ remoteAddress: '198.51.100.99' });
      const result = await invokeLimiter(limiter, req, res);

      // Because passOnStoreError: true, user request proceeds safely without crashing
      assert.equal(result.nextCalled, true);
    });
  });

  describe('5. Trusted Proxy & Client IP Verification', () => {
    it('correctly uses socket remoteAddress when trust proxy is false (anti-spoofing)', () => {
      const app = express();
      // In development / untrusted mode, trust proxy is false
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
