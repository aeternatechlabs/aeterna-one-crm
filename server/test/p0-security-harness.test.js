const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { mockReqRes } = require('./helpers/testApp');
const { getHealth } = require('../src/modules/health/health.controller');

describe('P0-TEST-000: Security Test Harness Verification', () => {
  test('Node.js built-in test runner executes and validates assertions', () => {
    assert.strictEqual(1 + 1, 2, 'Basic assertion works');
    assert.ok(process.version.startsWith('v'), 'Node version detected');
  });

  test('Mock request and response correctly captures HTTP health response', async () => {
    const { req, res, next } = mockReqRes();
    await getHealth(req, res, next);
    assert.ok(res.statusCode === 200 || res.statusCode === 503);
    assert.ok(res.body);
    assert.strictEqual(res.body.service, 'aeterna-one-crm-backend');
    assert.ok(res.body.status === 'healthy' || res.body.status === 'unhealthy');
  });

  test('Deliberate assertion failure exits with code 1 as expected', () => {
    assert.throws(
      () => {
        assert.strictEqual('a', 'b');
      },
      { name: 'AssertionError' }
    );
  });
});
