const { test, describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { mockReqRes } = require('./helpers/testApp');
const { ROLES, BRANCHES } = require('../src/config/constants');
const Student = require('../src/modules/students/student.model');
const Lead = require('../src/modules/leads/lead.model');
const PipelineStudent = require('../src/modules/pipeline/pipeline.model');
const CommunicationActivity = require('../src/modules/communications/activity.model');
const emailAdapter = require('../src/modules/communications/emailAdapter');

const {
  sendOutboundEmail,
  resolveAndAuthorizeCandidate,
  sanitizeHtmlContent,
} = require('../src/modules/communications/communications.controller');

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

describe('VULN-06: Outbound Email Authorization & Open Relay Abuse Prevention Suite', () => {
  const counsellorBlrId = new mongoose.Types.ObjectId();
  const counsellor2BlrId = new mongoose.Types.ObjectId();
  const branchMgrBlrId = new mongoose.Types.ObjectId();
  const superAdminId = new mongoose.Types.ObjectId();
  const receptionistId = new mongoose.Types.ObjectId();

  const studentBlrId = new mongoose.Types.ObjectId();
  const studentMysId = new mongoose.Types.ObjectId();
  const leadBlrId = new mongoose.Types.ObjectId();

  let origStudentFindOne;
  let origLeadFindById;
  let origPipelineFindById;
  let origActivityCreate;
  let origSendEmail;

  let activityAuditLogs = [];

  beforeEach(() => {
    activityAuditLogs = [];

    // Mock Student Database Queries
    origStudentFindOne = Student.findOne;
    Student.findOne = function (query) {
      const id = String(query._id);
      let record = null;

      if (id === String(studentBlrId)) {
        record = {
          _id: studentBlrId,
          studentName: 'Rahul Verma',
          email: 'rahul.verma@example.com',
          branch: BRANCHES.BENGALURU,
          assignedCounsellor: counsellorBlrId,
          isDeleted: false,
        };
      } else if (id === String(studentMysId)) {
        record = {
          _id: studentMysId,
          studentName: 'Sneha Hegde',
          email: 'sneha.mysuru@example.com',
          branch: BRANCHES.MYSURU,
          assignedCounsellor: new mongoose.Types.ObjectId(),
          isDeleted: false,
        };
      }

      return {
        lean: () => Promise.resolve(record),
        then: (resolve, reject) => Promise.resolve(record).then(resolve, reject),
      };
    };

    // Mock Lead Database Queries
    origLeadFindById = Lead.findById;
    Lead.findById = function (id) {
      let record = null;
      if (String(id) === String(leadBlrId)) {
        record = {
          _id: leadBlrId,
          name: 'Vikram Joshi',
          email: 'vikram.lead@example.com',
          branch: BRANCHES.BENGALURU,
          assigned_to: counsellorBlrId,
        };
      }
      return {
        lean: () => Promise.resolve(record),
        then: (resolve, reject) => Promise.resolve(record).then(resolve, reject),
      };
    };

    // Mock Pipeline Database Queries
    origPipelineFindById = PipelineStudent.findById;
    PipelineStudent.findById = function () {
      return {
        lean: () => Promise.resolve(null),
        then: (resolve, reject) => Promise.resolve(null).then(resolve, reject),
      };
    };

    // Mock CommunicationActivity creation
    origActivityCreate = CommunicationActivity.create;
    CommunicationActivity.create = async function (data) {
      const record = { ...data, _id: new mongoose.Types.ObjectId(), createdAt: new Date() };
      activityAuditLogs.push(record);
      return record;
    };

    // Mock EmailAdapter sendEmail
    origSendEmail = emailAdapter.sendEmail;
    emailAdapter.sendEmail = async function ({ to, subject, htmlBody }) {
      return {
        status: 'sent',
        provider: 'gmail_smtp',
        messageId: `msg_${Date.now()}_test`,
        recipient: to,
        subject,
        dispatchedAt: new Date(),
      };
    };
  });

  afterEach(() => {
    Student.findOne = origStudentFindOne;
    Lead.findById = origLeadFindById;
    PipelineStudent.findById = origPipelineFindById;
    CommunicationActivity.create = origActivityCreate;
    emailAdapter.sendEmail = origSendEmail;
  });

  describe('1. Role & Branch Containment Authorization', () => {
    it('allows a Counsellor to email their assigned candidate in their branch', async () => {
      const { req, res } = mockReqRes({
        user: {
          _id: counsellorBlrId,
          name: 'Anita Rao',
          role: ROLES.COUNSELLOR,
          branch: BRANCHES.BENGALURU,
        },
        body: {
          studentId: String(studentBlrId),
          to: 'rahul.verma@example.com',
          subject: 'University Application Status Update',
          htmlBody: '<p>Dear Rahul, your documents have been verified.</p>',
        },
      });

      const result = await invokeHandler(sendOutboundEmail, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);

      const data = res.body?.data || res.body;
      assert.equal(data.delivery?.status, 'sent');
      assert.equal(data.delivery?.recipient, 'rahul.verma@example.com');
      assert.ok(data.activityId);

      // Verify audit activity logged with candidate branch and actor
      assert.equal(activityAuditLogs.length, 1);
      assert.equal(activityAuditLogs[0].branch, BRANCHES.BENGALURU);
      assert.equal(activityAuditLogs[0].recipient, 'rahul.verma@example.com');
      assert.equal(String(activityAuditLogs[0].actorId), String(counsellorBlrId));
    });

    it('strictly forbids a Counsellor from emailing a candidate belonging to another branch (403)', async () => {
      const { req, res } = mockReqRes({
        // Bengaluru counsellor attempting to email a Mysuru student
        user: {
          _id: counsellorBlrId,
          name: 'Anita Rao',
          role: ROLES.COUNSELLOR,
          branch: BRANCHES.BENGALURU,
        },
        body: {
          studentId: String(studentMysId),
          to: 'sneha.mysuru@example.com',
          subject: 'Cross Branch Enquiry',
          textBody: 'Hello from Bengaluru branch.',
        },
      });

      const result = await invokeHandler(sendOutboundEmail, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError?.statusCode, 403);
      assert.match(result.nextError?.message, /Candidate belongs to another branch/i);

      // Verify zero emails dispatched and zero activity logs
      assert.equal(activityAuditLogs.length, 0);
    });

    it('strictly forbids a Counsellor from emailing a candidate assigned to another counsellor (403)', async () => {
      const { req, res } = mockReqRes({
        // Counsellor 2 attempting to email candidate assigned to Counsellor 1
        user: {
          _id: counsellor2BlrId,
          name: 'Ramesh Gowda',
          role: ROLES.COUNSELLOR,
          branch: BRANCHES.BENGALURU,
        },
        body: {
          studentId: String(studentBlrId),
          to: 'rahul.verma@example.com',
          subject: 'Unauthorized Outreach',
          textBody: 'Contacting candidate of another counsellor.',
        },
      });

      const result = await invokeHandler(sendOutboundEmail, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError?.statusCode, 403);
      assert.match(result.nextError?.message, /assigned to another counsellor/i);
      assert.equal(activityAuditLogs.length, 0);
    });

    it('allows a Branch Manager to email any candidate within their own branch', async () => {
      const { req, res } = mockReqRes({
        user: {
          _id: branchMgrBlrId,
          name: 'Vikramaditya Manager',
          role: ROLES.BRANCH_MANAGER,
          branch: BRANCHES.BENGALURU,
        },
        body: {
          studentId: String(studentBlrId),
          to: 'rahul.verma@example.com',
          subject: 'Welcome to Aeterna Bengaluru',
          textBody: 'Branch manager greeting.',
        },
      });

      const result = await invokeHandler(sendOutboundEmail, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);
      assert.equal(activityAuditLogs.length, 1);
    });

    it('strictly forbids a Branch Manager from emailing a cross-branch candidate (403)', async () => {
      const { req, res } = mockReqRes({
        // Bengaluru Branch Manager attempting to email Mysuru candidate
        user: {
          _id: branchMgrBlrId,
          name: 'Vikramaditya Manager',
          role: ROLES.BRANCH_MANAGER,
          branch: BRANCHES.BENGALURU,
        },
        body: {
          studentId: String(studentMysId),
          to: 'sneha.mysuru@example.com',
          subject: 'Cross Branch Notice',
          textBody: 'Notice from another branch.',
        },
      });

      const result = await invokeHandler(sendOutboundEmail, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError?.statusCode, 403);
      assert.match(result.nextError?.message, /Candidate belongs to another branch/i);
      assert.equal(activityAuditLogs.length, 0);
    });

    it('allows Super Admin to email candidates across any branch', async () => {
      const { req, res } = mockReqRes({
        user: {
          _id: superAdminId,
          name: 'Executive Super Admin',
          role: ROLES.SUPER_ADMIN,
          branch: BRANCHES.ALL,
        },
        body: {
          studentId: String(studentMysId),
          to: 'sneha.mysuru@example.com',
          subject: 'Central Audit & Welcome',
          textBody: 'Central management dispatch.',
        },
      });

      const result = await invokeHandler(sendOutboundEmail, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);
      assert.equal(activityAuditLogs.length, 1);
      assert.equal(activityAuditLogs[0].branch, BRANCHES.MYSURU);
    });

    it('strictly forbids unauthorized user roles (e.g., Receptionist, Accountant) from sending emails (403)', async () => {
      const { req, res } = mockReqRes({
        user: {
          _id: receptionistId,
          name: 'Pooja Reception',
          role: 'receptionist',
          branch: BRANCHES.BENGALURU,
        },
        body: {
          studentId: String(studentBlrId),
          to: 'rahul.verma@example.com',
          subject: 'Front Desk Notice',
          textBody: 'Please visit front desk.',
        },
      });

      const result = await invokeHandler(sendOutboundEmail, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError?.statusCode, 403);
      assert.match(result.nextError?.message, /not authorized to dispatch outbound emails/i);
      assert.equal(activityAuditLogs.length, 0);
    });
  });

  describe('2. Open Relay & Recipient Hijacking Prevention', () => {
    it('strictly rejects arbitrary external recipient addresses with valid studentId (400)', async () => {
      const { req, res } = mockReqRes({
        user: {
          _id: counsellorBlrId,
          name: 'Anita Rao',
          role: ROLES.COUNSELLOR,
          branch: BRANCHES.BENGALURU,
        },
        body: {
          studentId: String(studentBlrId),
          // Attacker attempts to hijack valid student ID to send spam to third-party bank
          to: 'phishing-victim@externalbank.com',
          subject: 'Urgent Account Verification',
          textBody: 'Click here to verify your banking credentials.',
        },
      });

      const result = await invokeHandler(sendOutboundEmail, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError?.statusCode, 400);
      assert.match(result.nextError?.message, /does not match candidate email on record/i);
      assert.equal(activityAuditLogs.length, 0);
    });

    it('strictly rejects ordinary staff requests missing both studentId and leadId (400)', async () => {
      const { req, res } = mockReqRes({
        user: {
          _id: counsellorBlrId,
          name: 'Anita Rao',
          role: ROLES.COUNSELLOR,
          branch: BRANCHES.BENGALURU,
        },
        body: {
          to: 'random-person@external.com',
          subject: 'Unlinked Outreach',
          textBody: 'Outreach without candidate record.',
        },
      });

      const result = await invokeHandler(sendOutboundEmail, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError?.statusCode, 400);
      assert.match(result.nextError?.message, /require an associated studentId or leadId/i);
      assert.equal(activityAuditLogs.length, 0);
    });

    it('strictly rejects non-existent candidate ID (404)', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const { req, res } = mockReqRes({
        user: {
          _id: counsellorBlrId,
          name: 'Anita Rao',
          role: ROLES.COUNSELLOR,
          branch: BRANCHES.BENGALURU,
        },
        body: {
          studentId: String(fakeId),
          to: 'rahul.verma@example.com',
          subject: 'Notice',
          textBody: 'Some content.',
        },
      });

      const result = await invokeHandler(sendOutboundEmail, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError?.statusCode, 404);
      assert.match(result.nextError?.message, /Candidate record not found/i);
      assert.equal(activityAuditLogs.length, 0);
    });
  });

  describe('3. Malformed Email & Header Injection Protection', () => {
    it('strictly rejects invalid recipient email formats (400)', async () => {
      const { req, res } = mockReqRes({
        user: {
          _id: counsellorBlrId,
          name: 'Anita Rao',
          role: ROLES.COUNSELLOR,
          branch: BRANCHES.BENGALURU,
        },
        body: {
          studentId: String(studentBlrId),
          to: 'not-an-email-format',
          subject: 'Notice',
          textBody: 'Content.',
        },
      });

      const result = await invokeHandler(sendOutboundEmail, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError?.statusCode, 400);
      assert.match(result.nextError?.message, /Invalid recipient email format/i);
      assert.equal(activityAuditLogs.length, 0);
    });

    it('strictly rejects CRLF header injection attempts in recipient address (400)', async () => {
      const { req, res } = mockReqRes({
        user: {
          _id: counsellorBlrId,
          name: 'Anita Rao',
          role: ROLES.COUNSELLOR,
          branch: BRANCHES.BENGALURU,
        },
        body: {
          studentId: String(studentBlrId),
          to: 'rahul.verma@example.com\r\nBcc: spy@hacker.com',
          subject: 'Notice',
          textBody: 'Content.',
        },
      });

      const result = await invokeHandler(sendOutboundEmail, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError?.statusCode, 400);
      assert.match(result.nextError?.message, /Prohibited characters or header injection detected/i);
      assert.equal(activityAuditLogs.length, 0);
    });

    it('strictly rejects CRLF header injection attempts in email subject (400)', async () => {
      const { req, res } = mockReqRes({
        user: {
          _id: counsellorBlrId,
          name: 'Anita Rao',
          role: ROLES.COUNSELLOR,
          branch: BRANCHES.BENGALURU,
        },
        body: {
          studentId: String(studentBlrId),
          to: 'rahul.verma@example.com',
          subject: 'Application Update\r\nBcc: secret-bcc@hacker.com',
          textBody: 'Content.',
        },
      });

      const result = await invokeHandler(sendOutboundEmail, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError?.statusCode, 400);
      assert.match(result.nextError?.message, /cannot contain carriage returns, newlines/i);
      assert.equal(activityAuditLogs.length, 0);
    });

    it('sanitizes dangerous HTML tags (<script>, <iframe>, <object>) from htmlBody', () => {
      const dirtyHtml = `
        <div>
          <h2>Congratulations</h2>
          <script>alert("XSS")</script>
          <iframe src="http://malicious.com"></iframe>
          <object data="bad.swf"></object>
          <a href="javascript:stealTokens()">Click here</a>
          <p>Your visa documents are ready.</p>
        </div>
      `;

      const clean = sanitizeHtmlContent(dirtyHtml);
      assert.equal(clean.includes('<script>'), false);
      assert.equal(clean.includes('alert("XSS")'), false);
      assert.equal(clean.includes('<iframe'), false);
      assert.equal(clean.includes('<object'), false);
      assert.equal(clean.includes('javascript:'), false);
      assert.ok(clean.includes('<h2>Congratulations</h2>'));
      assert.ok(clean.includes('<p>Your visa documents are ready.</p>'));
    });
  });

  describe('4. Delivery Failure Handling & Audit Integrity', () => {
    it('creates a failed CommunicationActivity audit log when SMTP transmission fails (500)', async () => {
      emailAdapter.sendEmail = async function () {
        throw new Error('Connection timeout to SMTP gateway');
      };

      const { req, res } = mockReqRes({
        user: {
          _id: counsellorBlrId,
          name: 'Anita Rao',
          role: ROLES.COUNSELLOR,
          branch: BRANCHES.BENGALURU,
        },
        body: {
          studentId: String(studentBlrId),
          to: 'rahul.verma@example.com',
          subject: 'Transmission Failure Test',
          textBody: 'Testing delivery failure path.',
        },
      });

      const result = await invokeHandler(sendOutboundEmail, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError?.statusCode, 500);
      assert.match(result.nextError?.message, /Connection timeout to SMTP gateway/i);

      // Verify failure audit record was generated for accountability
      assert.equal(activityAuditLogs.length, 1);
      assert.equal(activityAuditLogs[0].status, 'failed');
      assert.match(activityAuditLogs[0].notes, /Delivery failed: Connection timeout/);
      assert.equal(activityAuditLogs[0].branch, BRANCHES.BENGALURU);
    });

    it('successfully handles Lead candidate records', async () => {
      const { req, res } = mockReqRes({
        user: {
          _id: counsellorBlrId,
          name: 'Anita Rao',
          role: ROLES.COUNSELLOR,
          branch: BRANCHES.BENGALURU,
        },
        body: {
          leadId: String(leadBlrId),
          to: 'vikram.lead@example.com',
          subject: 'Overseas Counselling Consultation',
          textBody: 'Hi Vikram, confirming our follow-up call.',
        },
      });

      const result = await invokeHandler(sendOutboundEmail, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);

      assert.equal(activityAuditLogs.length, 1);
      assert.equal(activityAuditLogs[0].recipient, 'vikram.lead@example.com');
      assert.equal(String(activityAuditLogs[0].leadId), String(leadBlrId));
      assert.equal(activityAuditLogs[0].branch, BRANCHES.BENGALURU);
    });
  });
});
