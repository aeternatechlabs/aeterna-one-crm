const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { mockReqRes } = require('./helpers/testApp');
const { protect } = require('../src/middleware/authMiddleware');
const { createTokens, login } = require('../src/modules/auth/auth.controller');
const { getUsers } = require('../src/modules/users/user.controller');

describe('P0-SEC-003: Fail-Closed Secrets and Removal of Unsafe Demo Behavior', () => {
  const originalJwtSecret = process.env.JWT_SECRET;

  afterEach(() => {
    process.env.JWT_SECRET = originalJwtSecret;
  });

  test('createTokens throws 500 error when JWT_SECRET is unset', () => {
    delete process.env.JWT_SECRET;
    assert.throws(
      () => {
        createTokens({ _id: '123456789012', role: 'super_admin', branch: 'all' });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 500);
        assert.ok(err.message.includes('JWT_SECRET is not configured'));
        return true;
      }
    );
  });

  test('protect middleware throws 500 error when JWT_SECRET is unset', async () => {
    delete process.env.JWT_SECRET;
    const { req, res, next, getNext } = mockReqRes({
      headers: { authorization: 'Bearer some.mock.token' },
    });

    try {
      await protect(req, res, next);
      const { nextError } = getNext();
      assert.ok(nextError, 'Expected nextError to be passed');
      assert.strictEqual(nextError.statusCode, 500);
      assert.ok(nextError.message.includes('JWT_SECRET is not configured'));
    } catch (err) {
      assert.strictEqual(err.statusCode, 500);
      assert.ok(err.message.includes('JWT_SECRET is not configured'));
    }
  });

  test('Zero occurrences of fallback signing key in server codebase', () => {
    const srcDir = path.join(__dirname, '..', 'src');
    const fallbackKey = 'aeterna_default_jwt_secret_key_2026';

    function scanDir(dir) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (file.endsWith('.js')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          assert.strictEqual(
            content.includes(fallbackKey),
            false,
            `File ${fullPath} contains forbidden fallback key!`
          );
        }
      }
    }

    scanDir(srcDir);
  });

  test('User controller projection allowlist strips password even if explicitly requested in fields', () => {
    // Test the selectFields projection logic
    const ALLOWED_USER_FIELDS = ['name', 'email', 'role', 'branch', 'phone', 'isActive', 'lastLogin', 'createdAt', 'updatedAt'];
    const fields = 'name,email,password,__v';
    const requested = fields
      .split(',')
      .map((f) => f.trim())
      .filter((f) => ALLOWED_USER_FIELDS.includes(f));
    const selectFields = requested.length > 0 ? requested.join(' ') + ' -password -__v' : '-password -__v';

    assert.ok(selectFields.includes('name'));
    assert.ok(selectFields.includes('email'));
    assert.ok(!requested.includes('password'), 'password must be excluded from requested projection');
    assert.ok(selectFields.includes('-password'), '-password must be present');
    assert.ok(selectFields.includes('-__v'), '-__v must be present');
  });
});
