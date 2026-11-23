const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { mockReqRes } = require('./helpers/testApp');
const {
  ROLES,
  BRANCHES,
  TASK_TYPES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  REACHOUT_CHANNELS,
  DISPOSITION_OUTCOMES,
} = require('../src/config/constants');
const Task = require('../src/modules/tasks/task.model');
const {
  calculateSlaDeadline,
  computeSlaStatus,
  checkEscalationEligibility,
} = require('../src/modules/tasks/slaEngine');
const {
  renderTemplate,
  sanitizeHtml,
  TEMPLATE_CATALOG,
} = require('../src/modules/communications/templateEngine');
const {
  verifyWebhookSignature,
  generateDirectWhatsAppUrl,
} = require('../src/modules/communications/whatsappAdapter');
const { sendEmail } = require('../src/modules/communications/emailAdapter');
const {
  calculateExponentialBackoff,
  generateDedupKey,
} = require('../src/modules/communications/retryHandler');

describe('Day 60: Phase B4 Independent Verification & Release Gate', () => {
  test('60.1.1: SLA Engine calculates business-hours deadline excluding non-working hours and Sundays', () => {
    // Start on Monday at 10:00 AM IST
    const mondayMorning = new Date(2026, 10, 16, 10, 0, 0); // Monday
    const deadline = calculateSlaDeadline(mondayMorning, TASK_PRIORITIES.URGENT); // 2 hours = 120 mins
    assert.equal(deadline.getHours(), 12);
    assert.equal(deadline.getMinutes(), 0);

    // Urgent task created Saturday at 18:00 (30 mins before close).
    // Remaining 90 mins must roll over to Monday morning (9:30 + 90 mins = 11:00 AM).
    const saturdayEvening = new Date(2026, 10, 21, 18, 0, 0); // Saturday
    const mondayDeadline = calculateSlaDeadline(saturdayEvening, TASK_PRIORITIES.URGENT);
    assert.equal(mondayDeadline.getDay(), 1); // Monday
    assert.equal(mondayDeadline.getHours(), 11);
    assert.equal(mondayDeadline.getMinutes(), 0);
  });

  test('60.1.2: computeSlaStatus deterministically detects ON_TRACK, APPROACHING_BREACH, and BREACHED', () => {
    const now = new Date('2026-11-20T12:00:00Z');

    // Due in 2 hours -> ON_TRACK
    const futureDue = new Date('2026-11-20T14:00:00Z');
    const onTrack = computeSlaStatus(futureDue, now);
    assert.equal(onTrack.status, 'ON_TRACK');
    assert.equal(onTrack.isBreached, false);

    // Due in 15 mins -> APPROACHING_BREACH
    const warningDue = new Date('2026-11-20T12:15:00Z');
    const warning = computeSlaStatus(warningDue, now);
    assert.equal(warning.status, 'APPROACHING_BREACH');
    assert.equal(warning.isBreached, false);

    // Due 5 mins ago -> BREACHED
    const pastDue = new Date('2026-11-20T11:55:00Z');
    const breached = computeSlaStatus(pastDue, now);
    assert.equal(breached.status, 'BREACHED');
    assert.equal(breached.isBreached, true);
  });

  test('60.1.3: checkEscalationEligibility accurately identifies uncompleted overdue tasks for escalation', () => {
    const now = new Date('2026-11-20T12:00:00Z');

    const activeOverdue = {
      status: TASK_STATUSES.PENDING,
      isEscalated: false,
      dueDate: new Date('2026-11-20T11:00:00Z'),
    };
    assert.equal(checkEscalationEligibility(activeOverdue, now), true);

    const alreadyCompleted = {
      status: TASK_STATUSES.COMPLETED,
      isEscalated: false,
      dueDate: new Date('2026-11-20T11:00:00Z'),
    };
    assert.equal(checkEscalationEligibility(alreadyCompleted, now), false);

    const alreadyEscalated = {
      status: TASK_STATUSES.PENDING,
      isEscalated: true,
      dueDate: new Date('2026-11-20T11:00:00Z'),
    };
    assert.equal(checkEscalationEligibility(alreadyEscalated, now), false);
  });

  test('60.1.4: renderTemplate substitutes variables and sanitizes HTML against XSS', () => {
    const rawTemplate = 'Hello {{candidate_name}}, welcome to {{target_university}}!';
    const variables = {
      candidate_name: '<script>alert("xss")</script>Rohan',
      target_university: 'Imperial College London & Data Lab',
    };

    const rendered = renderTemplate(rawTemplate, variables);
    assert.ok(!rendered.includes('<script>'));
    assert.ok(rendered.includes('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;Rohan'));
    assert.ok(rendered.includes('Imperial College London &amp; Data Lab'));
  });

  test('60.1.5: generateDirectWhatsAppUrl creates clean wa.me link with digits only', () => {
    const phone = '+91 98451-12345';
    const text = 'Hello Rohan, discussing your offer';
    const url = generateDirectWhatsAppUrl(phone, text);

    assert.ok(url.startsWith('https://wa.me/919845112345?text='));
    assert.ok(url.includes('Hello%20Rohan'));
    // Must not contain spaces, plus signs, or hyphens in phone segment
    assert.ok(!url.includes('wa.me/+91'));
    assert.ok(!url.includes('wa.me/91-98451'));
  });

  test('60.1.6: verifyWebhookSignature validates Meta HMAC-SHA256 signatures with timing-safe comparison', () => {
    const crypto = require('crypto');
    const secret = 'meta_test_webhook_secret_key_2026';
    const rawBody = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });

    const validHash = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const validHeader = `sha256=${validHash}`;

    // Valid signature must pass
    assert.equal(verifyWebhookSignature(validHeader, rawBody, secret), true);

    // Tampered payload must be rejected
    assert.equal(verifyWebhookSignature(validHeader, rawBody + 'tamper', secret), false);

    // Tampered header must be rejected
    assert.equal(verifyWebhookSignature('sha256=1234567890abcdef', rawBody, secret), false);
  });

  test('60.1.7: emailAdapter executes in safe dry-run mode when live credentials are not set', async () => {
    const originalUser = process.env.GMAIL_SMTP_USER;
    const originalPass = process.env.GMAIL_SMTP_PASS;
    delete process.env.GMAIL_SMTP_USER;
    delete process.env.GMAIL_SMTP_PASS;

    const result = await sendEmail({
      to: 'rohan.sharma@example.com',
      subject: 'University Offer Update',
      textBody: 'Congratulations on your offer',
    });

    assert.equal(result.status, 'dry_run');
    assert.equal(result.provider, 'gmail_sandbox_dry_run');
    assert.ok(result.messageId.startsWith('dry_run_'));

    if (originalUser) process.env.GMAIL_SMTP_USER = originalUser;
    if (originalPass) process.env.GMAIL_SMTP_PASS = originalPass;
  });

  test('60.1.8: calculateExponentialBackoff produces deterministic retry intervals capped at 24h', () => {
    const attempt1 = calculateExponentialBackoff(1, 5, 1440);
    assert.equal(attempt1.backoffMinutes, 5); // 5 * 2^0 = 5m

    const attempt2 = calculateExponentialBackoff(2, 5, 1440);
    assert.equal(attempt2.backoffMinutes, 10); // 5 * 2^1 = 10m

    const attempt3 = calculateExponentialBackoff(3, 5, 1440);
    assert.equal(attempt3.backoffMinutes, 20); // 5 * 2^2 = 20m

    const attempt10 = calculateExponentialBackoff(10, 5, 1440);
    assert.equal(attempt10.backoffMinutes, 1440); // Capped at 1440m (24h)
  });

  test('60.1.9: generateDedupKey produces consistent idempotency keys within time bucket', () => {
    const key1 = generateDedupKey('reachout', 'task_123', 60000);
    const key2 = generateDedupKey('reachout', 'task_123', 60000);
    assert.equal(key1, key2);

    const keyOther = generateDedupKey('reachout', 'task_456', 60000);
    assert.notEqual(key1, keyOther);
  });
});
