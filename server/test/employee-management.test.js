const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/aeterna_one_crm_test_employees';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-aeterna-one-crm-secure-key-123';

const Employee = require('../src/modules/employees/employee.model');
const User = require('../src/modules/users/user.model');
const { ROLES, BRANCHES } = require('../src/config/constants');
const { mockReqRes } = require('./helpers/testApp');
const {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  deleteEmployee,
  restoreEmployee,
  permanentDeleteEmployee,
} = require('../src/modules/employees/employee.controller');

describe('Employee Management Architecture (Super Admin Exclusive)', () => {
  let isMongoConnected = false;
  let superAdminUser;

  before(async () => {
    try {
      await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 2000 });
      isMongoConnected = true;
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.dropDatabase();
      }

      superAdminUser = await User.create({
        name: 'Super Admin Founder',
        email: 'founder.test@aeterna.com',
        password: 'Password@123',
        role: ROLES.SUPER_ADMIN,
        branch: BRANCHES.ALL,
        phone: '+91 99000 00001',
        isActive: true,
      });
    } catch {
      // Standalone mode without running mongod daemon
      isMongoConnected = false;
    }
  });

  after(async () => {
    if (isMongoConnected && mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  });

  describe('1. Model Validation & Schema Integrity', () => {
    test('Employee model instantiates with required fields and virtuals', () => {
      const emp = new Employee({
        first_name: 'Sachin',
        last_name: 'Tiwari',
        employee_code: 'AET-100',
        email: 'sachin.tiwari@aeterna.com',
        department: 'Executive',
        designation: 'Founder & Super Admin',
        branch: BRANCHES.BENGALURU,
        role: ROLES.SUPER_ADMIN,
      });

      assert.equal(emp.first_name, 'Sachin');
      assert.equal(emp.last_name, 'Tiwari');
      assert.equal(emp.name, 'Sachin Tiwari');
      assert.equal(emp.employee_code, 'AET-100');
      assert.equal(emp.deletionStage, 'ACTIVE');
      assert.equal(emp.employment_status, 'Active');
    });

    test('Employee model validation fails when required fields are missing', () => {
      const emp = new Employee({});
      const err = emp.validateSync();
      assert.ok(err);
      assert.ok(err.errors.first_name);
      assert.ok(err.errors.last_name);
      assert.ok(err.errors.employee_code);
      assert.ok(err.errors.email);
    });
  });

  describe('2. Controller Unit Checks (Mocked Request/Response)', () => {
    test('getEmployees rejects invalid search query exceeding 50 characters', async () => {
      const { req, res, next, getNext } = mockReqRes({
        query: { search: 'a'.repeat(51) },
      });

      await getEmployees(req, res, next);
      const { nextError } = getNext();
      assert.ok(nextError);
      assert.equal(nextError.statusCode, 400);
      assert.match(nextError.message, /Search query cannot exceed 50 characters/i);
    });

    test('createEmployee requires first_name, last_name, and email', async () => {
      const { req, res, next, getNext } = mockReqRes({
        user: { role: ROLES.SUPER_ADMIN },
        body: { first_name: 'Ramesh' }, // missing last_name and email
      });

      await createEmployee(req, res, next);
      const { nextError } = getNext();
      assert.ok(nextError);
      assert.equal(nextError.statusCode, 400);
    });

    test('createEmployee strictly prohibits creating Super Admin staff with HTTP 403', async () => {
      const { req, res, next, getNext } = mockReqRes({
        user: { role: ROLES.SUPER_ADMIN },
        body: {
          first_name: 'Sneaky',
          last_name: 'Admin',
          email: 'sneaky.admin@aeterna.com',
          role: ROLES.SUPER_ADMIN,
        },
      });

      await createEmployee(req, res, next);
      const { nextError } = getNext();
      assert.ok(nextError);
      assert.equal(nextError.statusCode, 403);
      assert.match(nextError.message, /Super Admin accounts cannot be created via Staff Management/i);
    });

    test('createEmployee rejects invalid roles with HTTP 400', async () => {
      const { req, res, next, getNext } = mockReqRes({
        user: { role: ROLES.SUPER_ADMIN },
        body: {
          first_name: 'Hacker',
          last_name: 'Role',
          email: 'hacker@aeterna.com',
          role: 'unknown_role',
        },
      });

      await createEmployee(req, res, next);
      const { nextError } = getNext();
      assert.ok(nextError);
      assert.equal(nextError.statusCode, 400);
      assert.match(nextError.message, /Invalid staff role/i);
    });

    test('toggleEmployeeStatus rejects invalid status', async () => {
      const { req, res, next, getNext } = mockReqRes({
        params: { id: new mongoose.Types.ObjectId().toString() },
        body: { employment_status: 'NonExistentStatus' },
      });

      await toggleEmployeeStatus(req, res, next);
      const { nextError } = getNext();
      assert.ok(nextError);
      assert.equal(nextError.statusCode, 400);
      assert.match(nextError.message, /Invalid status/i);
    });
  });

  describe('3. Database Persistence & Lifecycle (when MongoDB available)', () => {
    test('Provisions employee and generates login credentials', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const { req, res, next, getNext } = mockReqRes({
        user: superAdminUser,
        body: {
          first_name: 'Ananya',
          last_name: 'Deshpande',
          employee_code: 'AET-201',
          email: 'ananya.deshpande@aeterna.com',
          branch: BRANCHES.BENGALURU,
          role: ROLES.COUNSELLOR,
          department: 'Counselling & Admissions',
          designation: 'Senior Education Counsellor',
          password: 'Password@123',
          contact_info: { phone: '+91 98860 11223' },
        },
      });

      await createEmployee(req, res, next);

      assert.equal(res.statusCode, 201);
      assert.ok(res.body);
      const data = res.body.data || res.body;
      assert.equal(data.credentials.email, 'ananya.deshpande@aeterna.com');
      assert.equal(data.credentials.password, 'Password@123');
      assert.equal(data.credentials.employee_code, 'AET-201');
      assert.equal(data.credentials.role, ROLES.COUNSELLOR);

      const userRecord = await User.findOne({ email: 'ananya.deshpande@aeterna.com' });
      assert.ok(userRecord);
      assert.equal(userRecord.name, 'Ananya Deshpande');
      assert.equal(userRecord.isActive, true);
    });

    test('Rejects duplicate employee code with HTTP 409', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const { req, res, next, getNext } = mockReqRes({
        user: superAdminUser,
        body: {
          first_name: 'Duplicate',
          last_name: 'User',
          employee_code: 'AET-201',
          email: 'different@aeterna.com',
        },
      });

      await createEmployee(req, res, next);
      const { nextError } = getNext();
      assert.ok(nextError);
      assert.equal(nextError.statusCode, 409);
    });

    test('Soft-deletes employee by moving to TRASH and deactivates User session', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const emp = await Employee.findOne({ email: 'ananya.deshpande@aeterna.com' });
      assert.ok(emp);

      const { req, res, next } = mockReqRes({
        user: superAdminUser,
        params: { id: emp._id.toString() },
        body: { deleteReason: 'Archived by Administrator' },
      });

      await deleteEmployee(req, res, next);

      assert.equal(res.statusCode, 200);

      const trashed = await Employee.findById(emp._id);
      assert.equal(trashed.deletionStage, 'TRASH');
      assert.equal(trashed.deleteReason, 'Archived by Administrator');

      const userRecord = await User.findById(emp.user_id);
      assert.equal(userRecord.isActive, false);
    });

    test('Restores employee from TRASH to ACTIVE and reactivates user', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const emp = await Employee.findOne({ email: 'ananya.deshpande@aeterna.com' });
      emp.employment_status = 'Active';
      await emp.save();

      const { req, res, next } = mockReqRes({
        user: superAdminUser,
        params: { id: emp._id.toString() },
      });

      await restoreEmployee(req, res, next);

      assert.equal(res.statusCode, 200);

      const restored = await Employee.findById(emp._id);
      assert.equal(restored.deletionStage, 'ACTIVE');

      const userRecord = await User.findById(emp.user_id);
      assert.equal(userRecord.isActive, true);
    });
  });
});
