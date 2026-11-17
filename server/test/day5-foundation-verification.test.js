/**
 * Phase A Day 5 — Foundation Verification & Handover Test Suite
 *
 * Exercises and verifies:
 * 1. Health endpoints (/health & /api/v1/health) with database connected (200) and disconnected (503)
 * 2. Service metadata and supported physical branch reporting
 * 3. Client route-level code splitting chunks in production build
 * 4. Production bundle security & zero secret leakage
 * 5. Global ErrorBoundary and Suspense loading resilience contracts
 * 6. Phase A deliverable documentation integrity
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/aeterna_one_crm_test_day5';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'aeterna-day5-verification-secret-key-2026';
process.env.MONGO_URI = TEST_MONGO_URI;
delete process.env.CLIENT_URL;
delete process.env.FRONTEND_URL;

const app = require('../src/app');

let server;
let baseUrl;

const fetchRaw = (endpointPath, opts = {}) => fetch(baseUrl + endpointPath, opts);

before(async () => {
  assert.ok(process.env.MONGO_URI.includes('_test'), 'SAFETY: *_test database only');
  await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.dropDatabase();

  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

test('Day 5 Verification: 1. GET /health with DB connected returns 200 healthy', async () => {
  const res = await fetchRaw('/health');
  assert.equal(res.status, 200);
  const body = await res.json();
  const data = body.data || body;
  assert.equal(data.status, 'healthy');
  assert.equal(data.database, 'connected');
  assert.equal(data.service, 'aeterna-one-crm-backend');
  assert.ok(typeof data.uptimeSeconds === 'number');
  assert.deepEqual(data.supportedBranches, ['bengaluru', 'mysuru', 'belagavi']);
});

test('Day 5 Verification: 2. GET /api/v1/health with DB connected returns 200 healthy', async () => {
  const res = await fetchRaw('/api/v1/health');
  assert.equal(res.status, 200);
  const body = await res.json();
  const data = body.data || body;
  assert.equal(data.status, 'healthy');
  assert.equal(data.database, 'connected');
});

test('Day 5 Verification: 3. Health endpoints flip to 503 unhealthy when DB is disconnected', async () => {
  await mongoose.disconnect();
  try {
    const resRoot = await fetchRaw('/health');
    assert.equal(resRoot.status, 503);
    const bodyRoot = await resRoot.json();
    const dataRoot = bodyRoot.data || bodyRoot;
    assert.equal(dataRoot.status, 'unhealthy');
    assert.equal(dataRoot.database, 'disconnected');
    assert.match(dataRoot.message, /degraded \(database disconnected\)/i);

    const resV1 = await fetchRaw('/api/v1/health');
    assert.equal(resV1.status, 503);
    const bodyV1 = await resV1.json();
    const dataV1 = bodyV1.data || bodyV1;
    assert.equal(dataV1.status, 'unhealthy');
    assert.equal(dataV1.database, 'disconnected');
  } finally {
    await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  }
});

test('Day 5 Verification: 4. Health endpoints restore to 200 healthy after DB reconnection', async () => {
  const res = await fetchRaw('/health');
  assert.equal(res.status, 200);
  const body = await res.json();
  const data = body.data || body;
  assert.equal(data.status, 'healthy');
  assert.equal(data.database, 'connected');
});

test('Day 5 Verification: 5. Route-level code splitting chunks exist in production client build', () => {
  const distAssetsDir = path.resolve(__dirname, '../../client/dist/assets');
  assert.ok(fs.existsSync(distAssetsDir), 'client/dist/assets must exist');

  const files = fs.readdirSync(distAssetsDir);
  const requiredRouteChunks = [
    'LoginPage',
    'DashboardPage',
    'PipelinePage',
    'UnauthorizedPage',
    'NotFoundPage',
  ];

  for (const routeChunk of requiredRouteChunks) {
    const found = files.some((f) => f.startsWith(`${routeChunk}-`) && f.endsWith('.js'));
    assert.ok(found, `Expected production chunk for ${routeChunk} to exist in dist/assets`);
  }
});

test('Day 5 Verification: 6. Production client bundle contains zero leaked secrets or passwords', () => {
  const distAssetsDir = path.resolve(__dirname, '../../client/dist/assets');
  const files = fs.readdirSync(distAssetsDir).filter((f) => f.endsWith('.js'));

  for (const file of files) {
    const content = fs.readFileSync(path.join(distAssetsDir, file), 'utf-8');
    assert.ok(!content.includes('Password@123'), `Chunk ${file} must not leak demo password`);
    assert.ok(!content.includes('aeterna_default_jwt_secret_key_2026'), `Chunk ${file} must not contain jwt secret`);
  }
});

test('Day 5 Verification: 7. Global ErrorBoundary and Suspense loading resilience contracts', () => {
  const appJsx = fs.readFileSync(path.resolve(__dirname, '../../client/src/App.jsx'), 'utf-8');
  assert.match(appJsx, /<ErrorBoundary>/, 'App.jsx must wrap application root in ErrorBoundary');
  assert.match(appJsx, /<QueryClientProvider/, 'App.jsx must configure QueryClientProvider');

  const appRoutesJsx = fs.readFileSync(path.resolve(__dirname, '../../client/src/routes/AppRoutes.jsx'), 'utf-8');
  assert.match(appRoutesJsx, /<Suspense fallback=\{<LoadingSpinner/, 'AppRoutes.jsx must wrap routes in Suspense with LoadingSpinner');
  assert.match(appRoutesJsx, /const LoginPage = lazy\(/, 'LoginPage must be code-split lazy loaded');
  assert.match(appRoutesJsx, /const DashboardPage = lazy\(/, 'DashboardPage must be code-split lazy loaded');
  assert.match(appRoutesJsx, /const PipelinePage = lazy\(/, 'PipelinePage must be code-split lazy loaded');
});

test('Day 5 Verification: 8. Phase A documentation deliverables integrity', () => {
  const matrixPath = path.resolve(__dirname, '../../docs/ROLE_PERMISSION_MATRIX.md');
  assert.ok(fs.existsSync(matrixPath), 'docs/ROLE_PERMISSION_MATRIX.md must exist');
  const matrixContent = fs.readFileSync(matrixPath, 'utf-8');
  assert.match(matrixContent, /Centralized Role & Permission Matrix/i);
  assert.match(matrixContent, /Branch-Access & Isolation Matrix/i);
  assert.match(matrixContent, /Tamper-Vector Defense & Test Evidence Matrix/i);

  const inventoryPath = path.resolve(__dirname, '../../docs/COMPONENT_INVENTORY.md');
  assert.ok(fs.existsSync(inventoryPath), 'docs/COMPONENT_INVENTORY.md must exist');
  const inventoryContent = fs.readFileSync(inventoryPath, 'utf-8');
  assert.match(inventoryContent, /Shared Common Component Inventory/i);
  assert.match(inventoryContent, /Select\.jsx/i);
  assert.match(inventoryContent, /useFocusTrap/i);
});
