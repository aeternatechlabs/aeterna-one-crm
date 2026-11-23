const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('../node_modules/mongoose');

const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/aeterna_one_crm_test_institutions';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-aeterna-one-crm-institutions-key-2026';

const app = require('../src/app');
const User = require('../src/modules/users/user.model');
const { Institution } = require('../src/modules/institutions/institution.model');
const { ROLES, BRANCHES } = require('../src/config/constants');
const { mockReqRes } = require('./helpers/testApp');
const { createInstitution } = require('../src/modules/institutions/institution.controller');

describe('Institution Master Directory: Schools, Colleges & Coaching Centers', () => {
  let isMongoConnected = false;
  let server;
  let baseUrl;
  let counsellorToken;
  let superAdminToken;

  const api = async (method, endpoint, { token, body, headers = {} } = {}) => {
    const res = await fetch(baseUrl + endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try {
      json = await res.json();
    } catch {}
    return { status: res.status, ok: res.ok, body: json };
  };

  before(async () => {
    try {
      await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 2000 });
      isMongoConnected = true;
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.dropDatabase();
      }

      await User.create([
        {
          name: 'Priya Counsellor',
          email: 'counsellor.inst@aeterna.com',
          password: 'Password@123',
          role: ROLES.COUNSELLOR,
          branch: BRANCHES.BENGALURU,
          isActive: true,
        },
        {
          name: 'Super Admin',
          email: 'admin.inst@aeterna.com',
          password: 'Password@123',
          role: ROLES.SUPER_ADMIN,
          branch: BRANCHES.ALL,
          isActive: true,
        },
      ]);

      server = app.listen(0, '127.0.0.1');
      await new Promise((resolve) => server.once('listening', resolve));
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api/v1`;

      // Log in counsellor and super admin
      const cRes = await api('POST', '/auth/login', {
        body: { email: 'counsellor.inst@aeterna.com', password: 'Password@123' },
      });
      counsellorToken = cRes.body.token || cRes.body.data?.token;

      const aRes = await api('POST', '/auth/login', {
        body: { email: 'admin.inst@aeterna.com', password: 'Password@123' },
      });
      superAdminToken = aRes.body.token || aRes.body.data?.token;
    } catch {
      isMongoConnected = false;
    }
  });

  after(async () => {
    if (server) {
      server.close();
    }
    if (isMongoConnected && mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  });

  // =========================================================================
  // 0. CONTROLLER IN-MEMORY VALIDATION
  // =========================================================================
  describe('0. In-Memory Controller Unit Checks', () => {
    test('createInstitution rejects missing name with HTTP 400', async () => {
      const { req, res, next, getNext } = mockReqRes({
        method: 'POST',
        body: { institution_type: 'school', city: 'Bengaluru' },
      });
      await createInstitution(req, res, next);
      const { nextError } = getNext();
      assert.ok(nextError);
      assert.equal(nextError.statusCode, 400);
      assert.match(nextError.message, /name is required/i);
    });

    test('createInstitution rejects invalid institution type with HTTP 400', async () => {
      const { req, res, next, getNext } = mockReqRes({
        method: 'POST',
        body: { name: 'Acme Institute', institution_type: 'random_invalid_type', city: 'Bengaluru' },
      });
      await createInstitution(req, res, next);
      const { nextError } = getNext();
      assert.ok(nextError);
      assert.equal(nextError.statusCode, 400);
      assert.match(nextError.message, /Invalid institution type/i);
    });

    test('createInstitution rejects missing city with HTTP 400', async () => {
      const { req, res, next, getNext } = mockReqRes({
        method: 'POST',
        body: { name: 'Acme School', institution_type: 'school' },
      });
      await createInstitution(req, res, next);
      const { nextError } = getNext();
      assert.ok(nextError);
      assert.equal(nextError.statusCode, 400);
      assert.match(nextError.message, /City is required/i);
    });
  });

  // =========================================================================
  // 1. LIVE CRUD OPERATIONS ACROSS SCHOOL, COLLEGE & COACHING INSTITUTE
  // =========================================================================
  describe('1. Live CRUD for School, College, and Coaching Institute', () => {
    let createdSchoolId;
    let createdCollegeId;
    let createdCoachingId;

    test('Counsellor creates new SCHOOL record via POST /api/v1/institutions', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const res = await api('POST', '/institutions', {
        token: counsellorToken,
        body: {
          name: 'Delhi Public School (Bangalore South)',
          institution_type: 'school',
          category: 'K-12 Senior Secondary',
          board_or_affiliation: 'CBSE',
          branch: BRANCHES.BENGALURU,
          city: 'Bengaluru',
          address: 'Kanakapura Main Road, Bengaluru, Karnataka 560062',
          contact_person: {
            name: 'Anupama Ramachandran',
            designation: 'Career & College Counsellor',
            phone: '+91 98450 11990',
            email: 'counselling@dpsbangalore.edu.in',
          },
          official_email: 'info@dpsbangalore.edu.in',
          official_phone: '+91 80 2666 8888',
          partnership_status: 'Active MoU',
          target_destinations: ['United Kingdom', 'United States', 'Canada', 'Australia'],
        },
      });

      assert.equal(res.status, 201);
      const inst = res.body.institution || res.body.data?.institution;
      assert.ok(inst);
      assert.equal(inst.name, 'Delhi Public School (Bangalore South)');
      assert.equal(inst.institution_type, 'school');
      assert.equal(inst.partnership_status, 'Active MoU');
      createdSchoolId = inst._id;
    });

    test('Counsellor creates new COLLEGE record via POST /api/v1/institutions', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const res = await api('POST', '/institutions', {
        token: counsellorToken,
        body: {
          name: 'Mount Carmel College (Autonomous)',
          institution_type: 'college',
          category: 'Autonomous Degree & PG College',
          board_or_affiliation: 'Bangalore City University',
          branch: BRANCHES.BENGALURU,
          city: 'Bengaluru',
          address: '58, Palace Road, Vasanth Nagar, Bengaluru, Karnataka 560052',
          contact_person: {
            name: 'Dr. Sr. Albina',
            designation: 'Dean of Global Outreach',
            phone: '+91 98452 33441',
            email: 'outreach@mccblr.edu.in',
          },
          partnership_status: 'Partner',
          target_destinations: ['United Kingdom', 'Ireland', 'Germany', 'Australia'],
        },
      });

      assert.equal(res.status, 201);
      const inst = res.body.institution || res.body.data?.institution;
      assert.ok(inst);
      assert.equal(inst.institution_type, 'college');
      createdCollegeId = inst._id;
    });

    test('Counsellor creates new COACHING INSTITUTE record via POST /api/v1/institutions', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const res = await api('POST', '/institutions', {
        token: counsellorToken,
        body: {
          name: 'IMS Learning Centre (Koramangala Hub)',
          institution_type: 'coaching_institute',
          category: 'Test Prep & Admissions Academy',
          board_or_affiliation: 'IMS India Test Prep Network',
          branch: BRANCHES.BENGALURU,
          city: 'Bengaluru',
          address: '#24, 80 Feet Road, 4th Block, Koramangala, Bengaluru 560034',
          contact_person: {
            name: 'Siddharth Sen',
            designation: 'Center Director & Lead GRE/GMAT Trainer',
            phone: '+91 98860 44556',
            email: 'siddharth.sen@imsindia.com',
          },
          partnership_status: 'Campus Visited',
          target_destinations: ['United States', 'Germany', 'United Kingdom', 'Canada'],
        },
      });

      assert.equal(res.status, 201);
      const inst = res.body.institution || res.body.data?.institution;
      assert.ok(inst);
      assert.equal(inst.institution_type, 'coaching_institute');
      createdCoachingId = inst._id;
    });

    test('Rejects duplicate institution name with HTTP 409 Conflict', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const res = await api('POST', '/institutions', {
        token: counsellorToken,
        body: {
          name: 'Delhi Public School (Bangalore South)', // Exact duplicate
          institution_type: 'school',
          city: 'Bengaluru',
        },
      });

      assert.equal(res.status, 409);
      assert.match(res.body.message, /already exists/i);
    });

    test('Query institutions filters by type: school, college, coaching_institute', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      // 1. Filter schools
      const schoolRes = await api('GET', '/institutions?type=school', { token: counsellorToken });
      assert.equal(schoolRes.status, 200);
      const schools = schoolRes.body.institutions || schoolRes.body.data?.institutions || [];
      assert.ok(schools.every((i) => i.institution_type === 'school'));

      // 2. Filter coaching institutes
      const coachRes = await api('GET', '/institutions?type=coaching_institute', { token: counsellorToken });
      assert.equal(coachRes.status, 200);
      const coaching = coachRes.body.institutions || coachRes.body.data?.institutions || [];
      assert.ok(coaching.every((i) => i.institution_type === 'coaching_institute'));
    });

    test('Query institutions statistics returns breakdown across all categories', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const res = await api('GET', '/institutions/stats', { token: counsellorToken });
      assert.equal(res.status, 200);
      const stats = res.body.stats || res.body.data?.stats;
      assert.ok(stats.total >= 3);
      assert.ok(stats.totalSchools >= 1);
      assert.ok(stats.totalColleges >= 1);
      assert.ok(stats.totalCoaching >= 1);
      assert.ok(stats.totalPartnerships >= 2);
    });

    test('Update institution details via PUT /api/v1/institutions/:id', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const res = await api('PUT', `/institutions/${createdSchoolId}`, {
        token: counsellorToken,
        body: {
          student_intake_capacity: '450 annual high-school seniors',
          partnership_status: 'Partner',
        },
      });

      assert.equal(res.status, 200);
      const updated = await Institution.findById(createdSchoolId);
      assert.equal(updated.partnership_status, 'Partner');
      assert.equal(updated.student_intake_capacity, '450 annual high-school seniors');
    });

    test('Soft-delete institution via DELETE /api/v1/institutions/:id', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const res = await api('DELETE', `/institutions/${createdCoachingId}`, {
        token: superAdminToken,
      });

      assert.equal(res.status, 200);
      const deleted = await Institution.findById(createdCoachingId);
      assert.equal(deleted.deletionStage, 'TRASH');
    });
  });
});
