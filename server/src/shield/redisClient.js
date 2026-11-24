/**
 * Aeterna One — Shared Distributed Rate Limiting Store
 *
 * Implements a singleton Redis / Valkey client for multi-instance distributed rate limiting.
 * Reuses a single Redis connection across all rate limiters to avoid connection churn.
 * Falls back gracefully to in-memory store in local development or test environments.
 */

let _redisClient = null;

function isRedisConfigured() {
  return Boolean(process.env.REDIS_URL || process.env.REDIS_HOST);
}

function getRedisClient() {
  if (_redisClient) {
    return _redisClient;
  }

  if (!isRedisConfigured()) {
    if (
      process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT === 'true' ||
      process.env.RATE_LIMIT_STORE === 'redis'
    ) {
      throw new Error(
        'Server configuration error: Distributed rate limiting is required (REQUIRE_DISTRIBUTED_RATE_LIMIT=true), but REDIS_URL / REDIS_HOST is not configured.'
      );
    }
    return null;
  }

  let Redis;
  try {
    Redis = require('ioredis');
  } catch {
    if (process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT === 'true') {
      throw new Error(
        'Server configuration error: ioredis driver is required for distributed rate limiting in production.'
      );
    }
    return null;
  }

  const redisOptions = {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy(times) {
      // Reconnect with exponential backoff capped at 3 seconds
      return Math.min(times * 100, 3000);
    },
  };

  if (process.env.REDIS_URL) {
    _redisClient = new Redis(process.env.REDIS_URL, redisOptions);
  } else {
    _redisClient = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      ...redisOptions,
    });
  }

  // Gracefully handle connection errors to prevent unhandled node process exceptions
  _redisClient.on('error', (err) => {
    console.warn(`[Shield Redis] Connection notice: ${err.message}`);
  });

  return _redisClient;
}

function closeRedisClient() {
  if (_redisClient) {
    try {
      _redisClient.disconnect();
    } catch (_) {
      // Non-blocking cleanup
    }
    _redisClient = null;
  }
}

function createSharedRateLimitStore(prefix = 'rl:global:') {
  const client = getRedisClient();
  if (!client) {
    return undefined; // Express-rate-limit will use its built-in in-memory store
  }

  let RedisStore;
  try {
    const rlr = require('rate-limit-redis');
    RedisStore = rlr.RedisStore || rlr;
  } catch (err) {
    console.warn(`[Shield RateLimitStore] rate-limit-redis not found, using memory fallback: ${err.message}`);
    return undefined;
  }

  return new RedisStore({
    sendCommand: async (...args) => {
      try {
        return await client.call(...args);
      } catch (err) {
        console.warn(`[Shield RateLimitStore] Redis command error: ${err.message}`);
        throw err;
      }
    },
    prefix,
  });
}

module.exports = {
  isRedisConfigured,
  getRedisClient,
  closeRedisClient,
  createSharedRateLimitStore,
};
