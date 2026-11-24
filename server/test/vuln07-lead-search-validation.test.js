const { test, describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { mockReqRes } = require('./helpers/testApp');
const { ROLES, BRANCHES } = require('../src/config/constants');
const { Lead } = require('../src/modules/leads/lead.model');
const { getLeads } = require('../src/modules/leads/lead.controller');

function invokeHandler(handler, req, res) {
  return new Promise((resolve) => {
    const next = (err) => {
      resolve({ nextCalled: true, nextError: err || null, res });
    };

    const origJson = res.json ? res.json.bind(res) : null;
    res.json = (data) => {
      if (origJson) origJson(data);
      resolve({ nextCalled: false, nextError: null, res });
    };

    try {
      const result = handler(req, res, next);
      if (result && typeof result.then === 'function') {
        result.then(() => resolve({ nextCalled: false, nextError: null, res })).catch(next);
      }
    } catch (syncErr) {
      next(syncErr);
    }
  });
}

describe('VULN-07: Lead Search Input Validation & Query Resource Protection Suite', () => {
  const staffUserId = new mongoose.Types.ObjectId();
  let capturedQueries = [];
  let origCountDocuments;
  let origFind;
  let origAggregate;

  const mockLeadsData = [
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Aditya Ramesh Rao',
      email: 'aditya.rao@example.com',
      phone_number: '+91 98860 11223',
      destination_country: 'United Kingdom',
      branch: BRANCHES.BENGALURU,
      current_status: 'New',
      priority: 'high',
      deletionStage: 'ACTIVE',
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Sneha C++ Dev',
      email: 'sneha+testing@domain.org',
      phone_number: '+91 94480 99887',
      destination_country: 'Germany',
      branch: BRANCHES.BENGALURU,
      current_status: 'Interested',
      priority: 'medium',
      deletionStage: 'ACTIVE',
    },
  ];

  beforeEach(() => {
    capturedQueries = [];

    origCountDocuments = Lead.countDocuments;
    Lead.countDocuments = function (query) {
      capturedQueries.push({ type: 'countDocuments', query });
      return Promise.resolve(mockLeadsData.length);
    };

    origFind = Lead.find;
    Lead.find = function (query) {
      capturedQueries.push({ type: 'find', query });
      const chain = {
        populate: () => chain,
        sort: () => chain,
        skip: () => chain,
        limit: () => chain,
        lean: () => Promise.resolve(mockLeadsData),
        then: (resolve, reject) => Promise.resolve(mockLeadsData).then(resolve, reject),
      };
      return chain;
    };

    origAggregate = Lead.aggregate;
    Lead.aggregate = function () {
      return Promise.resolve([]);
    };
  });

  afterEach(() => {
    Lead.countDocuments = origCountDocuments;
    Lead.find = origFind;
    Lead.aggregate = origAggregate;
  });

  describe('1. Search Input Length Boundaries & Rejection', () => {
    it('accepts search query of exactly 50 characters and executes query safely', async () => {
      const fiftyCharSearch = 'a'.repeat(50);
      const { req, res } = mockReqRes({
        user: { _id: staffUserId, name: 'Anita Rao', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        query: { search: fiftyCharSearch },
      });

      const result = await invokeHandler(getLeads, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);

      // Verify Mongoose query was constructed
      assert.equal(capturedQueries.length, 2);
      const findQuery = capturedQueries.find((q) => q.type === 'find').query;
      assert.ok(findQuery.$or);
      assert.equal(findQuery.$or.length, 4);
    });

    it('strictly rejects search query of 51 characters with HTTP 400 before DB execution', async () => {
      const fiftyOneCharSearch = 'a'.repeat(51);
      const { req, res } = mockReqRes({
        user: { _id: staffUserId, name: 'Anita Rao', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        query: { search: fiftyOneCharSearch },
      });

      const result = await invokeHandler(getLeads, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError?.statusCode, 400);
      assert.match(result.nextError?.message, /Search query cannot exceed 50 characters/i);

      // Verify zero MongoDB queries were issued (resource exhaustion prevented)
      assert.equal(capturedQueries.length, 0);
    });

    it('strictly rejects extremely long search query (1,000+ characters) with HTTP 400 before DB execution', async () => {
      const hugeSearch = 'x'.repeat(2048);
      const { req, res } = mockReqRes({
        user: { _id: staffUserId, name: 'Anita Rao', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        query: { search: hugeSearch },
      });

      const result = await invokeHandler(getLeads, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError?.statusCode, 400);
      assert.match(result.nextError?.message, /Search query cannot exceed 50 characters/i);
      assert.equal(capturedQueries.length, 0);
    });
  });

  describe('2. Parameter Type Safety & Injection Protection', () => {
    it('strictly rejects non-string search parameter (e.g. nested object { $regex: "..." }) with HTTP 400', async () => {
      const { req, res } = mockReqRes({
        user: { _id: staffUserId, name: 'Anita Rao', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        query: { search: { $regex: '.*' } },
      });

      const result = await invokeHandler(getLeads, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError?.statusCode, 400);
      assert.match(result.nextError?.message, /Search query must be a string/i);
      assert.equal(capturedQueries.length, 0);
    });

    it('strictly rejects array search parameter (e.g. search[]="foo") with HTTP 400', async () => {
      const { req, res } = mockReqRes({
        user: { _id: staffUserId, name: 'Anita Rao', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        query: { search: ['term1', 'term2'] },
      });

      const result = await invokeHandler(getLeads, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError?.statusCode, 400);
      assert.match(result.nextError?.message, /Search query must be a string/i);
      assert.equal(capturedQueries.length, 0);
    });
  });

  describe('3. Regex Metacharacter Escaping & Literal Character Safety', () => {
    it('escapes regex metacharacters so they are evaluated as literal characters (ReDoS immune)', async () => {
      // Input containing all regex metacharacters: .*+?^${}()|[]\
      const metacharactersSearch = '.*+?^${}()|[]\\';
      const { req, res } = mockReqRes({
        user: { _id: staffUserId, name: 'Anita Rao', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        query: { search: metacharactersSearch },
      });

      const result = await invokeHandler(getLeads, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);

      const findQuery = capturedQueries.find((q) => q.type === 'find').query;
      assert.ok(findQuery.$or);

      // Verify the generated RegExp object contains escaped characters
      const regexObj = findQuery.$or[0].name;
      assert.ok(regexObj instanceof RegExp);
      // Ensure metacharacters are escaped with backslashes
      assert.ok(regexObj.source.includes('\\.'));
      assert.ok(regexObj.source.includes('\\*'));
      assert.ok(regexObj.source.includes('\\+'));
      assert.ok(regexObj.source.includes('\\?'));
      assert.ok(regexObj.source.includes('\\['));
      assert.ok(regexObj.source.includes('\\]'));
      assert.equal(regexObj.flags, 'i');
    });

    it('correctly handles special characters like plus signs in emails and phone numbers', async () => {
      const { req, res } = mockReqRes({
        user: { _id: staffUserId, name: 'Anita Rao', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        query: { search: '+91 98860' },
      });

      const result = await invokeHandler(getLeads, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);

      const findQuery = capturedQueries.find((q) => q.type === 'find').query;
      const regexObj = findQuery.$or[1].phone_number;
      assert.ok(regexObj.source.includes('\\+91'));
    });
  });

  describe('4. Missing, Empty & Normal Search Queries', () => {
    it('handles missing search parameter without adding $or filter', async () => {
      const { req, res } = mockReqRes({
        user: { _id: staffUserId, name: 'Anita Rao', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        query: {},
      });

      const result = await invokeHandler(getLeads, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);

      const findQuery = capturedQueries.find((q) => q.type === 'find').query;
      assert.equal(findQuery.$or, undefined);
    });

    it('handles empty string and whitespace-only search without adding $or filter', async () => {
      const { req, res } = mockReqRes({
        user: { _id: staffUserId, name: 'Anita Rao', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        query: { search: '     ' },
      });

      const result = await invokeHandler(getLeads, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);

      const findQuery = capturedQueries.find((q) => q.type === 'find').query;
      assert.equal(findQuery.$or, undefined);
    });

    it('performs case-insensitive search across name, phone, email, and destination_country', async () => {
      const { req, res } = mockReqRes({
        user: { _id: staffUserId, name: 'Anita Rao', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        query: { search: 'Aditya' },
      });

      const result = await invokeHandler(getLeads, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);

      const findQuery = capturedQueries.find((q) => q.type === 'find').query;
      assert.ok(findQuery.$or);
      assert.equal(findQuery.$or.length, 4);
      assert.ok(findQuery.$or[0].name);
      assert.ok(findQuery.$or[1].phone_number);
      assert.ok(findQuery.$or[2].email);
      assert.ok(findQuery.$or[3].destination_country);
    });
  });

  describe('5. Pagination Bounds & Filtering Preserved', () => {
    it('safely bounds pagination parameters (limit <= 100, page >= 1)', async () => {
      const { req, res } = mockReqRes({
        user: { _id: staffUserId, name: 'Anita Rao', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        query: { page: '-5', limit: '999999' },
      });

      const result = await invokeHandler(getLeads, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);

      const body = res.body?.data || res.body;
      assert.equal(body.pagination.page, 1);
      assert.equal(body.pagination.limit, 100);
    });

    it('preserves existing lead filters (status, priority, branch)', async () => {
      const { req, res } = mockReqRes({
        user: { _id: staffUserId, name: 'Super Admin', role: ROLES.SUPER_ADMIN, branch: BRANCHES.ALL },
        query: {
          search: 'Aditya',
          status: 'Interested',
          priority: 'high',
          branch: BRANCHES.BENGALURU,
        },
      });

      const result = await invokeHandler(getLeads, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);

      const findQuery = capturedQueries.find((q) => q.type === 'find').query;
      assert.equal(findQuery.current_status, 'Interested');
      assert.equal(findQuery.priority, 'high');
      assert.equal(findQuery.branch, BRANCHES.BENGALURU);
      assert.ok(findQuery.$or);
    });
  });
});
