const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('../node_modules/mongoose');

const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/aeterna_one_crm_test_api_seeder';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-aeterna-one-crm-api-seeder-key-2026';

const app = require('../src/app');
const User = require('../src/modules/users/user.model');
const Employee = require('../src/modules/employees/employee.model');
const { Lead } = require('../src/modules/leads/lead.model');
const PipelineStudent = require('../src/modules/pipeline/pipeline.model');
const { ROLES, BRANCHES } = require('../src/config/constants');
const { mockReqRes } = require('./helpers/testApp');

// Backend API Controllers for unit / in-memory checks
const { login } = require('../src/modules/auth/auth.controller');
const { createEmployee } = require('../src/modules/employees/employee.controller');
const { createLead, updateLeadStatus } = require('../src/modules/leads/lead.controller');

describe('Automated Multi-Role Backend API Seeder & RBAC Test Suite', () => {
  let isMongoConnected = false;
  let server;
  let baseUrl;
  let adminToken;
  let blrManagerToken;
  let counsellorToken;
  let mysManagerToken;

  // Preset Credentials from LoginPage.jsx
  const CREDENTIALS = {
    SUPER_ADMIN: { email: 'admin@aeterna.com', password: 'Password@123', role: ROLES.SUPER_ADMIN, branch: BRANCHES.ALL },
    BLR_MANAGER: { email: 'manager.bengaluru@aeterna.com', password: 'Password@123', role: ROLES.BRANCH_MANAGER, branch: BRANCHES.BENGALURU },
    BLR_COUNSELLOR: { email: 'counsellor.bengaluru@aeterna.com', password: 'Password@123', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
    MYS_MANAGER: { email: 'manager.mysuru@aeterna.com', password: 'Password@123', role: ROLES.BRANCH_MANAGER, branch: BRANCHES.MYSURU },
    ADMISSIONS_OFFICER: { email: 'admissions@aeterna.com', password: 'Password@123', role: ROLES.APPLICATION_OFFICER, branch: BRANCHES.BENGALURU },
  };

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

      // Seed baseline demo accounts corresponding to LoginPage.jsx
      await User.create([
        {
          name: 'Sachin Tiwari (Super Admin)',
          email: CREDENTIALS.SUPER_ADMIN.email,
          password: CREDENTIALS.SUPER_ADMIN.password,
          role: CREDENTIALS.SUPER_ADMIN.role,
          branch: CREDENTIALS.SUPER_ADMIN.branch,
          phone: '+91 99000 11223',
          isActive: true,
        },
        {
          name: 'Rajesh Varma (BLR Manager)',
          email: CREDENTIALS.BLR_MANAGER.email,
          password: CREDENTIALS.BLR_MANAGER.password,
          role: CREDENTIALS.BLR_MANAGER.role,
          branch: CREDENTIALS.BLR_MANAGER.branch,
          phone: '+91 98450 33445',
          isActive: true,
        },
        {
          name: 'Priya Nair (BLR Counsellor)',
          email: CREDENTIALS.BLR_COUNSELLOR.email,
          password: CREDENTIALS.BLR_COUNSELLOR.password,
          role: CREDENTIALS.BLR_COUNSELLOR.role,
          branch: CREDENTIALS.BLR_COUNSELLOR.branch,
          phone: '+91 98860 55667',
          isActive: true,
        },
        {
          name: 'Vikram Joshi (MYS Manager)',
          email: CREDENTIALS.MYS_MANAGER.email,
          password: CREDENTIALS.MYS_MANAGER.password,
          role: CREDENTIALS.MYS_MANAGER.role,
          branch: CREDENTIALS.MYS_MANAGER.branch,
          phone: '+91 98220 77889',
          isActive: true,
        },
        {
          name: 'Ananya Rao (Admissions)',
          email: CREDENTIALS.ADMISSIONS_OFFICER.email,
          password: CREDENTIALS.ADMISSIONS_OFFICER.password,
          role: CREDENTIALS.ADMISSIONS_OFFICER.role,
          branch: CREDENTIALS.ADMISSIONS_OFFICER.branch,
          phone: '+91 97400 99001',
          isActive: true,
        },
      ]);

      // Start in-process HTTP listener
      server = app.listen(0, '127.0.0.1');
      await new Promise((resolve) => server.once('listening', resolve));
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api/v1`;
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
  // 0. CONTROLLER LOGIC & RBAC ENFORCEMENT CHECKS (IN-MEMORY / 0 NETWORK)
  // =========================================================================
  describe('0. Immediate Controller Logic & RBAC Enforcement (In-Memory)', () => {
    test('Login rejects missing email or password with HTTP 400', async () => {
      const { req, res, next, getNext } = mockReqRes({
        method: 'POST',
        body: {},
      });
      await login(req, res, next);
      const { nextError } = getNext();
      assert.ok(nextError);
      assert.equal(nextError.statusCode, 400);
    });

    test('Employee creation strictly blocks Super Admin role assignment with HTTP 403', async () => {
      const { req, res, next, getNext } = mockReqRes({
        user: { role: ROLES.SUPER_ADMIN },
        body: {
          first_name: 'Impostor',
          last_name: 'Admin',
          email: 'impostor@aeterna.com',
          role: ROLES.SUPER_ADMIN,
        },
      });
      await createEmployee(req, res, next);
      const { nextError } = getNext();
      assert.ok(nextError);
      assert.equal(nextError.statusCode, 403);
      assert.match(nextError.message, /Super Admin accounts cannot be created via Staff Management/i);
    });

    test('Employee creation requires first_name, last_name, and official email', async () => {
      const { req, res, next, getNext } = mockReqRes({
        user: { role: ROLES.SUPER_ADMIN },
        body: { first_name: 'Incomplete' },
      });
      await createEmployee(req, res, next);
      const { nextError } = getNext();
      assert.ok(nextError);
      assert.equal(nextError.statusCode, 400);
    });

    test('Lead creation rejects missing student name or phone number with HTTP 400', async () => {
      const { req, res, next, getNext } = mockReqRes({
        user: { role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        body: { email: 'orphan@lead.com' },
      });
      await createLead(req, res, next);
      const { nextError } = getNext();
      assert.ok(nextError);
      assert.equal(nextError.statusCode, 400);
      assert.match(nextError.message, /Lead name is required/i);
    });

    test('Lead status update rejects invalid status with HTTP 400', async () => {
      const { req, res, next, getNext } = mockReqRes({
        user: { role: ROLES.COUNSELLOR },
        params: { id: new mongoose.Types.ObjectId().toString() },
        body: { current_status: 'InvalidBogusStatus' },
      });
      await updateLeadStatus(req, res, next);
      const { nextError } = getNext();
      assert.ok(nextError);
      assert.equal(nextError.statusCode, 400);
      assert.match(nextError.message, /Invalid status/i);
    });
  });

  // =========================================================================
  // 1. AUTHENTICATION & LOGIN API TESTS WITH DIFFERENT PRESET ROLES
  // =========================================================================
  describe('1. Authentication API Tests with Preset Credentials', () => {
    test('Super Admin logs in with preset credentials via POST /auth/login', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const res = await api('POST', '/auth/login', {
        body: {
          email: CREDENTIALS.SUPER_ADMIN.email,
          password: CREDENTIALS.SUPER_ADMIN.password,
        },
      });

      assert.equal(res.status, 200);
      adminToken = res.body.token || res.body.data?.token;
      assert.ok(adminToken, 'Must return JWT access token');
      const user = res.body.user || res.body.data?.user;
      assert.equal(user.role, ROLES.SUPER_ADMIN);
      assert.equal(user.email, CREDENTIALS.SUPER_ADMIN.email);
    });

    test('Branch Manager (BLR) logs in with preset credentials via POST /auth/login', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const res = await api('POST', '/auth/login', {
        body: {
          email: CREDENTIALS.BLR_MANAGER.email,
          password: CREDENTIALS.BLR_MANAGER.password,
        },
      });

      assert.equal(res.status, 200);
      blrManagerToken = res.body.token || res.body.data?.token;
      assert.ok(blrManagerToken);
      const user = res.body.user || res.body.data?.user;
      assert.equal(user.role, ROLES.BRANCH_MANAGER);
      assert.equal(user.branch, BRANCHES.BENGALURU);
    });

    test('Counsellor (BLR) logs in with preset credentials via POST /auth/login', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const res = await api('POST', '/auth/login', {
        body: {
          email: CREDENTIALS.BLR_COUNSELLOR.email,
          password: CREDENTIALS.BLR_COUNSELLOR.password,
        },
      });

      assert.equal(res.status, 200);
      counsellorToken = res.body.token || res.body.data?.token;
      assert.ok(counsellorToken);
      const user = res.body.user || res.body.data?.user;
      assert.equal(user.role, ROLES.COUNSELLOR);
    });

    test('Mysuru Manager logs in with preset credentials via POST /auth/login', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const res = await api('POST', '/auth/login', {
        body: {
          email: CREDENTIALS.MYS_MANAGER.email,
          password: CREDENTIALS.MYS_MANAGER.password,
        },
      });

      assert.equal(res.status, 200);
      mysManagerToken = res.body.token || res.body.data?.token;
      assert.ok(mysManagerToken);
    });
  });

  // =========================================================================
  // 2. SUPER ADMIN API OPERATIONS: EMPLOYEE & ARCHIVE SEEDING
  // =========================================================================
  describe('2. Super Admin API: Staff Provisioning & Trash Vault Operations', () => {
    let createdStaffId;

    test('Super Admin provisions new staff member via POST /api/v1/employees', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const res = await api('POST', '/employees', {
        token: adminToken,
        body: {
          first_name: 'Kavya',
          last_name: 'Hegde',
          employee_code: 'AET-104',
          email: 'kavya.hegde@aeterna.com',
          branch: BRANCHES.BENGALURU,
          role: ROLES.MARKETING,
          department: 'Marketing & Lead Generation',
          designation: 'Marketing Lead',
          password: 'Password@123',
          profile_photo: '/staff/avatar-visa-m2.jpg',
          contact_info: {
            phone: '+91 98451 77665',
            address: '#108, HSR Layout Sector 1, Bengaluru - 560102',
            emergency_contact_name: 'Ashok Hegde (Father)',
            emergency_contact_phone: '+91 98451 00998',
          },
        },
      });

      assert.equal(res.status, 201);
      const emp = res.body.employee || res.body.data?.employee;
      assert.ok(emp);
      assert.equal(emp.employee_code, 'AET-104');
      assert.equal(emp.email, 'kavya.hegde@aeterna.com');
      createdStaffId = emp._id;
    });

    test('Super Admin provisions another staff member destined for trash testing', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const res = await api('POST', '/employees', {
        token: adminToken,
        body: {
          first_name: 'Harish',
          last_name: 'Shetty',
          employee_code: 'AET-901',
          email: 'harish.shetty@aeterna.com',
          branch: BRANCHES.BELAGAVI,
          role: ROLES.COUNSELLOR,
          department: 'Counselling & Admissions',
          designation: 'Education Counsellor',
          password: 'Password@123',
          profile_photo: '/staff/avatar-manager-m1.jpg',
        },
      });

      assert.equal(res.status, 201);
      const emp = res.body.employee || res.body.data?.employee;
      const harishId = emp._id;

      // Soft-delete to Trash Vault via DELETE /api/v1/employees/:id
      const delRes = await api('DELETE', `/employees/${harishId}`, {
        token: adminToken,
        body: { deleteReason: 'Resigned due to personal relocation to Pune' },
      });
      assert.equal(delRes.status, 200);

      // Verify Harish appears in Trash Vault via GET /api/v1/employees/trash
      const trRes = await api('GET', '/employees/trash', { token: adminToken });
      assert.equal(trRes.status, 200);
      const trashList = trRes.body.employees || trRes.body.data?.employees || [];
      assert.ok(trashList.some((e) => e.employee_code === 'AET-901'), 'Trashed staff must appear in vault');
    });

    test('Super Admin restores staff member from Trash via POST /api/v1/employees/:id/restore', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const trashed = await Employee.findOne({ employee_code: 'AET-901', deletionStage: 'TRASH' });
      assert.ok(trashed);

      const restoreRes = await api('POST', `/employees/${trashed._id}/restore`, {
        token: adminToken,
        body: {},
      });
      assert.equal(restoreRes.status, 200);

      const restored = await Employee.findById(trashed._id);
      assert.equal(restored.deletionStage, 'ACTIVE');
    });

    test('RBAC Gate: Branch Manager cannot access /api/v1/employees (HTTP 403 Forbidden)', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const res = await api('GET', '/employees', { token: blrManagerToken });
      assert.equal(res.status, 403, 'Branch Manager must receive HTTP 403 Forbidden on staff management');
    });
  });

  // =========================================================================
  // 3. MULTI-ROLE LEAD INGESTION & STATUS TRANSITIONS
  // =========================================================================
  describe('3. Multi-Role Lead Management API Operations', () => {
    let createdLeadId;

    test('Branch Manager (BLR) creates new lead via POST /api/v1/leads', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const res = await api('POST', '/leads', {
        token: blrManagerToken,
        body: {
          name: 'Aditya Ramesh Rao',
          phone_number: '+91 98451 10001',
          email: 'aditya.rao@gmail.com',
          branch: BRANCHES.BENGALURU,
          destination_country: 'United Kingdom',
          study_level: "Master's",
          intake_target: 'Fall 2026',
          priority: 'high',
          notes: 'B.E. Computer Science from BMSCE (8.4 CGPA). Looking for MSc Data Science at Imperial College / UCL.',
          source: 'website',
        },
      });

      assert.equal(res.status, 201);
      const lead = res.body.lead || res.body.data?.lead;
      assert.ok(lead);
      assert.equal(lead.name, 'Aditya Ramesh Rao');
      assert.equal(lead.current_status, 'New');
      createdLeadId = lead._id;
    });

    test('Counsellor (BLR) updates lead status to Follow Up via PATCH /api/v1/leads/:id/status', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      const res = await api('PATCH', `/leads/${createdLeadId}/status`, {
        token: counsellorToken,
        body: {
          status: 'Follow Up',
          notes: 'Spoke with student. Discussed IELTS minimum band score (6.5). Scheduled profile review.',
          follow_up_date: tomorrow,
          follow_up_time: '11:30 AM',
        },
      });

      assert.equal(res.status, 200);
      const lead = res.body.lead || res.body.data?.lead;
      assert.equal(lead.current_status, 'Follow Up');
      assert.equal(lead.follow_up_time, '11:30 AM');
    });

    test('Counsellor (BLR) provisions another lead and converts it to student pipeline via POST /api/v1/leads/:id/convert', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      // 1. Create lead
      const leadRes = await api('POST', '/leads', {
        token: counsellorToken,
        body: {
          name: 'Tejaswini Shetty',
          phone_number: '+91 98456 60006',
          email: 'tejaswini.s@gmail.com',
          branch: BRANCHES.BENGALURU,
          destination_country: 'United Kingdom',
          study_level: "Master's",
          intake_target: 'Fall 2026',
          priority: 'high',
          notes: 'In-person counseling session completed. Shortlisted University of Manchester.',
          source: 'walk_in',
        },
      });

      assert.equal(leadRes.status, 201);
      const lead = leadRes.body.lead || leadRes.body.data?.lead;
      const leadId = lead._id;

      // 2. Convert to pipeline candidate
      const convRes = await api('POST', `/leads/${leadId}/convert`, {
        token: counsellorToken,
        body: {
          programme: 'MSc Business Analytics',
          university: 'University of Manchester',
        },
      });

      assert.equal(convRes.status, 200);
      const student = convRes.body.pipelineStudent || convRes.body.data?.pipelineStudent;
      assert.ok(student);
      assert.equal(student.studentName, 'Tejaswini Shetty');
      assert.equal(student.stage, 'new');

      // Check lead is updated to Deal Closed
      const updatedLead = await Lead.findById(leadId);
      assert.equal(updatedLead.current_status, 'Deal Closed');
      assert.ok(updatedLead.converted_to_student);
    });

    test('Mysuru Manager creates Mysuru branch lead via POST /api/v1/leads', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const res = await api('POST', '/leads', {
        token: mysManagerToken,
        body: {
          name: 'Darshan Wadeyar',
          phone_number: '+91 98220 11001',
          email: 'darshan.w@gmail.com',
          branch: BRANCHES.MYSURU,
          destination_country: 'United Kingdom',
          study_level: "Master's",
          intake_target: 'Fall 2026',
          priority: 'high',
          notes: 'Mysuru lead: Applied for MSc at University of Edinburgh.',
          source: 'walk_in',
        },
      });

      assert.equal(res.status, 201);
      const lead = res.body.lead || res.body.data?.lead;
      assert.equal(lead.branch, BRANCHES.MYSURU);
    });

    test('Query leads filters by search and follow-up view via GET /api/v1/leads', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const res = await api('GET', '/leads?search=Aditya', { token: adminToken });
      assert.equal(res.status, 200);
      const leads = res.body.leads || res.body.data?.leads || [];
      assert.ok(leads.length >= 1);
      assert.equal(leads[0].name, 'Aditya Ramesh Rao');
    });
  });
});
