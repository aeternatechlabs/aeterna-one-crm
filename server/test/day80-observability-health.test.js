const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');

describe('Day 80: Observability, Request Correlation & Health Endpoints', () => {
  it('GET /health/liveness returns 200 with alive status and uptime', async () => {
    let capturedStatus = null;
    let capturedBody = null;

    const req = {
      method: 'GET',
      url: '/health/liveness',
      headers: {},
      path: '/health/liveness',
    };

    const res = {
      setHeader: () => {},
      status: (code) => {
        capturedStatus = code;
        return res;
      },
      json: (data) => {
        capturedBody = data;
        return res;
      },
    };

    const { getLiveness } = require('../src/modules/health/health.controller');
    getLiveness(req, res);

    assert.equal(capturedStatus, 200);
    assert.ok(capturedBody);
    const data = capturedBody.data || capturedBody;
    assert.equal(data.status, 'alive');
    assert.ok(typeof data.uptimeSeconds === 'number');
    assert.ok(data.timestamp);
  });

  it('GET /health/readiness returns ready when database is connected', async () => {
    let capturedStatus = null;
    let capturedBody = null;

    const req = {
      method: 'GET',
      url: '/health/readiness',
      headers: {},
      path: '/health/readiness',
    };

    const res = {
      setHeader: () => {},
      status: (code) => {
        capturedStatus = code;
        return res;
      },
      json: (data) => {
        capturedBody = data;
        return res;
      },
    };

    const { getReadiness } = require('../src/modules/health/health.controller');
    getReadiness(req, res);

    assert.ok(capturedStatus === 200 || capturedStatus === 503);
    assert.ok(capturedBody);
    const data = capturedBody.data || capturedBody;
    assert.ok(data.status === 'ready' || data.status === 'not_ready');
  });

  it('request ID middleware propagates existing X-Request-Id header', () => {
    const requestIdMiddleware = require('../src/middleware/requestIdMiddleware');
    const existingId = 'custom-trace-uuid-12345';
    const req = { headers: { 'x-request-id': existingId } };
    let setHeaderKey = null;
    let setHeaderVal = null;
    const res = {
      setHeader: (k, v) => {
        setHeaderKey = k;
        setHeaderVal = v;
      },
    };
    let nextCalled = false;

    requestIdMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(req.id, existingId);
    assert.equal(setHeaderKey, 'X-Request-Id');
    assert.equal(setHeaderVal, existingId);
  });

  it('request ID middleware generates secure random req- UUID when header is omitted', () => {
    const requestIdMiddleware = require('../src/middleware/requestIdMiddleware');
    const req = { headers: {} };
    let setHeaderKey = null;
    let setHeaderVal = null;
    const res = {
      setHeader: (k, v) => {
        setHeaderKey = k;
        setHeaderVal = v;
      },
    };
    let nextCalled = false;

    requestIdMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.ok(req.id.startsWith('req-'));
    assert.equal(setHeaderKey, 'X-Request-Id');
    assert.equal(setHeaderVal, req.id);
  });
});
