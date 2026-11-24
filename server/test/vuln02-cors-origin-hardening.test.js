const { test, describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

// Set initial environment variables before loading app
process.env.NODE_ENV = 'development';
process.env.JWT_SECRET = 'test-jwt-secret-for-cors-testing-key-32chars!';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.FRONTEND_URL = 'https://aeterna-one-crm.vercel.app';
process.env.ALLOWED_ORIGINS = 'https://aeterna-one-crm.vercel.app,https://admin.aeterna.com';
process.env.VERCEL_PROJECT_NAME = 'aeterna-one-crm';
process.env.ALLOW_VERCEL_PREVIEWS = 'true';

const app = require('../src/app');
const { mockReqRes } = require('./helpers/testApp');

/**
 * Executes a simulated HTTP request through the Express application pipeline
 * without requiring TCP socket binding (100% sandbox safe).
 */
function invokeApp(options = {}) {
  return new Promise((resolve) => {
    const { req, res } = mockReqRes({
      method: options.method || 'GET',
      url: options.url || '/health',
      headers: options.headers || {},
      body: options.body || {},
    });

    let finished = false;
    const finish = () => {
      if (!finished) {
        finished = true;
        resolve({ req, res });
      }
    };

    const origJson = res.json.bind(res);
    res.json = function (data) {
      origJson(data);
      finish();
      return this;
    };

    const origSend = res.send.bind(res);
    res.send = function (data) {
      origSend(data);
      finish();
      return this;
    };

    res.end = function () {
      finish();
      return this;
    };

    app.handle(req, res, (err) => {
      if (err) {
        res.error = err;
        res.statusCode = err.statusCode || err.status || 500;
        res.body = {
          success: false,
          statusCode: res.statusCode,
          message: err.message,
        };
      }
      finish();
    });
  });
}

describe('VULN-02: Overly Permissive CORS Origin Configuration Hardening Suite', () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    process.env.CLIENT_URL = 'http://localhost:3000';
    process.env.FRONTEND_URL = 'https://aeterna-one-crm.vercel.app';
    process.env.ALLOWED_ORIGINS = 'https://aeterna-one-crm.vercel.app,https://admin.aeterna.com';
    process.env.VERCEL_PROJECT_NAME = 'aeterna-one-crm';
    process.env.ALLOW_VERCEL_PREVIEWS = 'true';
    delete process.env.CORS_ALLOW_ALL_DEV;
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  describe('1. Explicit Origin Allowlist & Normalization (app.corsHelpers)', () => {
    it('allows official production frontend origin from FRONTEND_URL', () => {
      assert.equal(app.corsHelpers.isOriginAllowed('https://aeterna-one-crm.vercel.app'), true);
    });

    it('allows custom allowed origins from ALLOWED_ORIGINS', () => {
      assert.equal(app.corsHelpers.isOriginAllowed('https://admin.aeterna.com'), true);
    });

    it('rejects unauthorized third-party malicious domain', () => {
      assert.equal(app.corsHelpers.isOriginAllowed('https://evil.com'), false);
      assert.equal(app.corsHelpers.isOriginAllowed('https://attacker-payload.org'), false);
    });

    it('rejects malformed and unparseable origins', () => {
      assert.equal(app.corsHelpers.isOriginAllowed('null'), false);
      assert.equal(app.corsHelpers.isOriginAllowed('not-a-url'), false);
      assert.equal(app.corsHelpers.isOriginAllowed('javascript:alert(1)'), false);
      assert.equal(app.corsHelpers.isOriginAllowed('file:///etc/passwd'), false);
      assert.equal(app.corsHelpers.isOriginAllowed(12345), false);
    });

    it('allows requests without an Origin header (mobile apps, curl, internal server requests)', () => {
      assert.equal(app.corsHelpers.isOriginAllowed(undefined), true);
      assert.equal(app.corsHelpers.isOriginAllowed(''), true);
      assert.equal(app.corsHelpers.isOriginAllowed(null), true);
    });
  });

  describe('2. Project-Specific Vercel Preview Domain Verification', () => {
    it('allows verified project preview branch deployments', () => {
      assert.equal(app.corsHelpers.isOriginAllowed('https://aeterna-one-crm-git-main-sachin.vercel.app'), true);
      assert.equal(app.corsHelpers.isOriginAllowed('https://aeterna-one-crm-feat-auth.vercel.app'), true);
      assert.equal(app.corsHelpers.isOriginAllowed('https://aeterna-one-crm-abc123xyz.vercel.app'), true);
    });

    it('rejects arbitrary unauthorized Vercel projects', () => {
      assert.equal(app.corsHelpers.isOriginAllowed('https://unauthorized-project.vercel.app'), false);
      assert.equal(app.corsHelpers.isOriginAllowed('https://random-attacker.vercel.app'), false);
      assert.equal(app.corsHelpers.isOriginAllowed('https://phishing-site.vercel.app'), false);
    });

    it('rejects lookalike domains attempting prefix or suffix confusion', () => {
      assert.equal(app.corsHelpers.isOriginAllowed('https://fakevercel.app'), false);
      assert.equal(app.corsHelpers.isOriginAllowed('https://evil-aeterna-one-crm.vercel.app'), false);
      assert.equal(app.corsHelpers.isOriginAllowed('https://aeterna-one-crm.vercel.app.attacker.com'), false);
      assert.equal(app.corsHelpers.isOriginAllowed('https://aeterna-one-crm.attacker.com'), false);
      assert.equal(app.corsHelpers.isOriginAllowed('https://attacker-aeterna-one-crm.vercel.app'), false);
    });

    it('rejects unencrypted HTTP Vercel preview origins', () => {
      assert.equal(app.corsHelpers.isOriginAllowed('http://aeterna-one-crm-git-main.vercel.app'), false);
    });

    it('rejects all preview domains when ALLOW_VERCEL_PREVIEWS is explicitly set to false', () => {
      process.env.ALLOW_VERCEL_PREVIEWS = 'false';
      assert.equal(app.corsHelpers.isOriginAllowed('https://aeterna-one-crm-git-main.vercel.app'), false);
      // Production primary domain still works because it is in explicit allowlist
      assert.equal(app.corsHelpers.isOriginAllowed('https://aeterna-one-crm.vercel.app'), true);
    });
  });

  describe('3. Localhost Origin Environment Restriction', () => {
    it('allows localhost and 127.0.0.1 origins during development / test', () => {
      process.env.NODE_ENV = 'development';
      assert.equal(app.corsHelpers.isOriginAllowed('http://localhost:3000'), true);
      assert.equal(app.corsHelpers.isOriginAllowed('http://127.0.0.1:3000'), true);
      assert.equal(app.corsHelpers.isOriginAllowed('http://localhost:5173'), true);
    });

    it('strictly denies unlisted localhost origins in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.CLIENT_URL;
      delete process.env.FRONTEND_URL;
      process.env.ALLOWED_ORIGINS = 'https://aeterna-one-crm.vercel.app';

      assert.equal(app.corsHelpers.isOriginAllowed('http://localhost:3000'), false);
      assert.equal(app.corsHelpers.isOriginAllowed('http://127.0.0.1:3000'), false);
      assert.equal(app.corsHelpers.isOriginAllowed('http://localhost:5173'), false);
    });
  });

  describe('4. Express Pipeline Integration & Credentials Protection', () => {
    it('serves credentialed response with ACAO and ACAC headers for authorized origin', async () => {
      const { res } = await invokeApp({
        url: '/health',
        headers: {
          origin: 'https://aeterna-one-crm.vercel.app',
        },
      });

      assert.ok([200, 503].includes(res.statusCode));
      assert.equal(res.headers['Access-Control-Allow-Origin'], 'https://aeterna-one-crm.vercel.app');
      assert.equal(res.headers['Access-Control-Allow-Credentials'], 'true');
    });

    it('serves credentialed response for authorized project preview origin', async () => {
      const { res } = await invokeApp({
        url: '/health',
        headers: {
          origin: 'https://aeterna-one-crm-preview-123.vercel.app',
        },
      });

      assert.ok([200, 503].includes(res.statusCode));
      assert.equal(res.headers['Access-Control-Allow-Origin'], 'https://aeterna-one-crm-preview-123.vercel.app');
      assert.equal(res.headers['Access-Control-Allow-Credentials'], 'true');
    });

    it('rejects unauthorized third-party origin with 500 CORS policy error and NO ACAO header', async () => {
      const { res } = await invokeApp({
        url: '/health',
        headers: {
          origin: 'https://attacker.example.com',
        },
      });

      assert.equal(res.statusCode, 500);
      assert.equal(res.headers['Access-Control-Allow-Origin'], undefined);
      assert.equal(res.headers['Access-Control-Allow-Credentials'], undefined);
      assert.equal(res.body.success, false);
      assert.equal(res.body.message, 'Not allowed by CORS policy');
    });

    it('rejects unauthorized arbitrary Vercel origin with NO ACAO header', async () => {
      const { res } = await invokeApp({
        url: '/health',
        headers: {
          origin: 'https://malicious-other-app.vercel.app',
        },
      });

      assert.equal(res.statusCode, 500);
      assert.equal(res.headers['Access-Control-Allow-Origin'], undefined);
      assert.equal(res.body.message, 'Not allowed by CORS policy');
    });

    it('handles preflight OPTIONS request from authorized origin', async () => {
      const { res } = await invokeApp({
        method: 'OPTIONS',
        url: '/health',
        headers: {
          origin: 'https://aeterna-one-crm.vercel.app',
          'access-control-request-method': 'GET',
          'access-control-request-headers': 'Authorization,Content-Type,x-branch',
        },
      });

      assert.ok([200, 204].includes(res.statusCode));
      assert.equal(res.headers['Access-Control-Allow-Origin'], 'https://aeterna-one-crm.vercel.app');
      assert.equal(res.headers['Access-Control-Allow-Credentials'], 'true');
      const allowHeaders = (res.headers['Access-Control-Allow-Headers'] || '').toLowerCase();
      assert.match(allowHeaders, /authorization/);
      assert.match(allowHeaders, /x-branch/);
    });

    it('rejects preflight OPTIONS request from unauthorized origin with no ACAO header', async () => {
      const { res } = await invokeApp({
        method: 'OPTIONS',
        url: '/health',
        headers: {
          origin: 'https://evil.attacker.com',
          'access-control-request-method': 'POST',
        },
      });

      assert.equal(res.statusCode, 500);
      assert.equal(res.headers['Access-Control-Allow-Origin'], undefined);
    });

    it('serves direct request without Origin header normally (curl / mobile)', async () => {
      const { res } = await invokeApp({
        url: '/health',
      });

      assert.ok([200, 503].includes(res.statusCode));
      assert.equal(res.headers['Access-Control-Allow-Origin'], undefined);
      assert.ok(res.body);
    });
  });
});
