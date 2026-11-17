/**
 * OpenCode Independent Tests — Frontend/Backend Contract (static source
 * analysis, no server). Verifies that client-side role gating matches the
 * server's requireRole sets exactly, that demo credentials are dev-gated,
 * and that no secrets ship in client source.
 */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SERVER_ROOT = path.join(__dirname, '..');
const CLIENT_SRC = path.join(SERVER_ROOT, '..', 'client', 'src');

const serverConstants = require('../src/config/constants');

const readServer = (rel) => fs.readFileSync(path.join(SERVER_ROOT, rel), 'utf8');
const readClient = (rel) => fs.readFileSync(path.join(CLIENT_SRC, rel), 'utf8');

const parseClientRoles = () => {
  const src = readClient('config/constants.js');
  const block = /export const ROLES = \{([\s\S]*?)\};/.exec(src);
  assert.ok(block, 'client ROLES block found');
  const map = {};
  for (const [, key, value] of block[1].matchAll(/([A-Z_]+):\s*'([^']+)'/g)) map[key] = value;
  return map;
};

const CLIENT_ROLES = parseClientRoles();

const setsEqual = (a, b, label) => {
  const as = [...a].sort();
  const bs = [...b].sort();
  assert.deepEqual(
    as,
    bs,
    `${label}: frontend [${as.join(', ')}] must equal backend [${bs.join(', ')}]`
  );
};

const extractBackendRouteRoles = () => {
  const src = readServer('src/modules/pipeline/pipeline.routes.js');
  const routes = {};
  const re = /router\.(get|post|patch)\(\s*\n?\s*'([^']*)',\s*\n?\s*requireRole\(([^)]+)\)/g;
  for (const [, method, routePath, args] of src.matchAll(re)) {
    const roles = args
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.startsWith('ROLES.'))
      .map((t) => serverConstants.ROLES[t.slice(6)]);
    routes[`${method.toUpperCase()} ${routePath}`] = roles;
  }
  return routes;
};

const BACKEND_PIPELINE_ROLES = extractBackendRouteRoles();

const permissionRoles = (resource, action) => {
  const src = readClient('config/permissions.js');
  const resStart = src.indexOf(`${resource}: {`);
  assert.ok(resStart !== -1, `permissions.${resource} exists`);
  const resourceBlock = src.slice(resStart, src.indexOf('\n  },', resStart));
  const actionRe = new RegExp(`${action}: \\[([^\\]]+)\\]`);
  const m = actionRe.exec(resourceBlock);
  assert.ok(m, `permissions.${resource}.${action} exists`);
  return m[1]
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.startsWith('ROLES.'))
    .map((t) => CLIENT_ROLES[t.slice(6)]);
};

test('contract: /pipeline route allowedRoles matches backend GET requireRole set', async () => {
  const appRoutes = readClient('routes/AppRoutes.jsx');
  const m = /allowedRoles=\{\[([\s\S]*?)\]\}/.exec(appRoutes);
  assert.ok(m, 'AppRoutes declares allowedRoles for /pipeline');
  const frontend = m[1]
    .split(',')
    .map((t) => t.trim().replace(/['\s]/g, ''))
    .filter(Boolean);
  setsEqual(frontend, BACKEND_PIPELINE_ROLES['GET /'], 'GET /pipeline roles');
});

test('contract: permissions.pipeline.view matches backend GET /pipeline roles', () => {
  setsEqual(permissionRoles('pipeline', 'view'), BACKEND_PIPELINE_ROLES['GET /'], 'pipeline.view');
});

test('contract: permissions.pipeline.moveStage matches backend PATCH stage roles', () => {
  setsEqual(permissionRoles('pipeline', 'moveStage'), BACKEND_PIPELINE_ROLES['PATCH /:id/stage'], 'pipeline.moveStage');
});

test('contract: permissions.students.create matches backend POST /pipeline roles', () => {
  setsEqual(permissionRoles('students', 'create'), BACKEND_PIPELINE_ROLES['POST /'], 'students.create');
});

test('contract: permissions.students.verifyDocs matches backend PATCH documents roles', () => {
  setsEqual(
    permissionRoles('students', 'verifyDocs'),
    BACKEND_PIPELINE_ROLES['PATCH /:id/documents'],
    'students.verifyDocs'
  );
});

test('contract: NAV_ITEMS /pipeline roles matches backend GET /pipeline roles', () => {
  const src = readClient('config/constants.js');
  const idx = src.indexOf("path: '/pipeline'");
  assert.ok(idx !== -1, 'NAV_ITEMS pipeline entry exists');
  const block = src.slice(idx, src.indexOf('\n  },', idx));
  const m = /roles: \[([\s\S]*?)\]/.exec(block);
  assert.ok(m, 'pipeline nav entry has roles');
  const resolved = [...m[1].matchAll(/ROLES\.([A-Z_]+)/g)].map((r) => CLIENT_ROLES[r[1]]);
  setsEqual(resolved, BACKEND_PIPELINE_ROLES['GET /'], 'NAV_ITEMS /pipeline');
});

test('contract: client and server ROLES literal values are identical', () => {
  for (const [key, value] of Object.entries(CLIENT_ROLES)) {
    assert.equal(serverConstants.ROLES[key], value, `ROLES.${key} parity`);
  }
  assert.equal(
    Object.keys(CLIENT_ROLES).length,
    Object.keys(serverConstants.ROLES).length,
    'same number of roles on both sides'
  );
});

test('ProtectedRoute enforces authentication and role membership with correct redirects', () => {
  const src = readClient('components/auth/ProtectedRoute.jsx');
  assert.match(src, /if \(!isAuthenticated\)/, 'checks authentication');
  assert.match(src, /<Navigate to="\/login"/, 'unauthenticated users go to /login');
  assert.match(src, /allowedRoles\.includes\(user\.role\)/, 'checks role membership');
  assert.match(src, /<Navigate to="\/unauthorized"/, 'wrong role goes to /unauthorized');
});

test('AppRoutes: /login is public, app pages sit behind ProtectedRoute, /unauthorized exists', () => {
  const src = readClient('routes/AppRoutes.jsx');
  assert.match(src, /path="\/login"[^>]*element=\{<LoginPage \/>/, 'login route public');
  assert.match(src, /<Route element=\{<ProtectedRoute \/>\}/, 'protected layout wrapper present');
  assert.match(src, /path="\/unauthorized"/, 'unauthorized page routed');
  assert.match(src, /path="\*" element=\{<NotFoundPage \/>/, '404 fallback routed');
});

test('api client configures withCredentials and clears stored user on 401', () => {
  const src = readClient('services/api.js');
  assert.match(src, /withCredentials:\s*true/, 'uses credentials for cookie auth');
  assert.match(src, /error\.response\.status === 401/, 'handles 401');
  assert.match(src, /localStorage\.removeItem\('aeterna_user'\)/, 'clears user on 401');
});

test('LoginPage demo credential section is gated behind import.meta.env.DEV', () => {
  const src = readClient('pages/LoginPage.jsx');
  assert.match(src, /const isDev = import\.meta\.env\.DEV/, 'reads DEV flag');
  assert.match(src, /isDev && \(/, 'demo section rendered only when isDev');
  const demoIdx = src.indexOf('DEMO_CREDENTIALS.map');
  const gateIdx = src.indexOf('isDev && (');
  assert.ok(gateIdx !== -1 && gateIdx < demoIdx, 'gate appears before DEMO_CREDENTIALS rendering');
});

test('DEMO_CREDENTIALS is referenced only by LoginPage and its definition file', () => {
  const files = fs.readdirSync(CLIENT_SRC, { recursive: true, encoding: 'utf8' });
  const importers = files
    .filter((f) => f.endsWith('.js') || f.endsWith('.jsx'))
    .filter((f) => fs.readFileSync(path.join(CLIENT_SRC, f), 'utf8').includes('DEMO_CREDENTIALS'))
    .map((f) => f.replace(/\\/g, '/'))
    .sort();
  assert.deepEqual(importers, ['config/constants.js', 'pages/LoginPage.jsx']);
});

test('client source contains no backend secrets (JWT_SECRET, private keys)', () => {
  const files = fs.readdirSync(CLIENT_SRC, { recursive: true, encoding: 'utf8' });
  const banned = [/JWT_SECRET/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /mongodb\+srv:\/\/[^'"]*:[^'"]*@/];
  const offenders = [];
  for (const f of files) {
    if (!f.endsWith('.js') && !f.endsWith('.jsx')) continue;
    const src = fs.readFileSync(path.join(CLIENT_SRC, f), 'utf8');
    for (const re of banned) {
      if (re.test(src)) offenders.push(`${f}: ${re}`);
    }
  }
  assert.deepEqual(offenders, [], 'no secrets found in client source');
});

test('FINDING P2: demo account password literals must not ship in client source', () => {
  const src = readClient('config/constants.js');
  assert.ok(
    !src.includes("password: 'Password@123'"),
    'demo passwords are bundled into the production JS bundle via DEMO_CREDENTIALS'
  );
});

test('FINDING P2: auth token must not be persisted in localStorage (XSS-exposed)', () => {
  const apiSrc = readClient('services/api.js');
  assert.ok(
    !apiSrc.includes("localStorage.getItem('aeterna_token')"),
    'token in localStorage is readable by any injected script; prefer httpOnly cookie only'
  );
});

after(() => {
  /* static analysis only — nothing to clean up */
});
