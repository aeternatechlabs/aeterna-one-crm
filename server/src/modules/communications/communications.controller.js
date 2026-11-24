const { asyncHandler, ApiError, ApiResponse } = require('../../utils/devilWrapper');
const {
  TEMPLATE_CATALOG,
  renderTemplate,
  getTemplatesByChannel,
} = require('./templateEngine');
const emailAdapter = require('./emailAdapter');
const { sendCloudWhatsAppMessage } = require('./whatsappAdapter');
const CommunicationActivity = require('./activity.model');
const Student = require('../students/student.model');
const Lead = require('../leads/lead.model');
const PipelineStudent = require('../pipeline/pipeline.model');
const { generateDedupKey } = require('./retryHandler');
const { ROLES, BRANCHES } = require('../../config/constants');

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Sanitizes outbound HTML email body to prevent XSS / malicious injections.
 */
function sanitizeHtmlContent(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/javascript\s*:/gi, '');
}

/**
 * Resolves candidate record and enforces strict RBAC, branch containment, and recipient verification.
 * Prevents open-relay abuse by verifying candidate ownership and recipient email match.
 */
async function resolveAndAuthorizeCandidate({ user, leadId, studentId, toEmail }) {
  const isSuperAdmin = user.role === ROLES.SUPER_ADMIN;

  // 1. Mandatory candidate record requirement for ordinary staff users
  if (!leadId && !studentId) {
    if (!isSuperAdmin) {
      throw new ApiError(400, 'Outbound emails require an associated studentId or leadId candidate record.');
    }
    // Super Admin operational dispatch without candidate record
    return {
      candidate: null,
      targetBranch: user.branch !== BRANCHES.ALL ? user.branch : BRANCHES.BENGALURU,
    };
  }

  // 2. Resolve candidate record from database
  let candidate = null;
  let candidateType = null;

  if (studentId) {
    candidate = await Student.findOne({ _id: studentId, isDeleted: { $ne: true } }).lean();
    candidateType = 'Student';
    if (!candidate) {
      candidate = await PipelineStudent.findById(studentId).lean();
      candidateType = 'PipelineStudent';
    }
  }

  if (!candidate && leadId) {
    candidate = await Lead.findById(leadId).lean();
    candidateType = 'Lead';
    if (!candidate) {
      candidate = await PipelineStudent.findById(leadId).lean();
      candidateType = 'PipelineStudent';
    }
  }

  if (!candidate) {
    throw new ApiError(404, 'Candidate record not found.');
  }

  const candidateBranch = candidate.branch || BRANCHES.BENGALURU;

  // 3. Branch containment: Candidate must belong to authenticated user's permitted branch
  if (!isSuperAdmin) {
    if (user.branch && user.branch !== BRANCHES.ALL && candidateBranch !== user.branch) {
      throw new ApiError(403, `Access denied: Candidate belongs to another branch (${candidateBranch}).`);
    }
  }

  // 4. Counsellor assignment authorization: Must be assigned to caller
  if (user.role === ROLES.COUNSELLOR && !isSuperAdmin) {
    const assignedCounsellorId =
      candidate.assigned_to ||
      candidate.assignedCounsellor ||
      candidate.counsellor;

    if (assignedCounsellorId && String(assignedCounsellorId) !== String(user._id)) {
      throw new ApiError(
        403,
        'Access denied: You are not authorized to email candidates assigned to another counsellor.'
      );
    }
  }

  // 5. Recipient address validation: Candidate on record must match requested recipient
  const candidateEmail = (candidate.email || '').trim().toLowerCase();
  const requestedEmail = (toEmail || '').trim().toLowerCase();

  if (!candidateEmail) {
    throw new ApiError(400, 'Candidate record does not have a registered email address on file.');
  }

  if (candidateEmail !== requestedEmail) {
    throw new ApiError(400, 'Recipient address does not match candidate email on record.');
  }

  return {
    candidate,
    candidateType,
    targetBranch: candidateBranch,
  };
}

const getTemplates = asyncHandler(async (req, res) => {
  const { channel } = req.query;
  if (channel) {
    const templates = getTemplatesByChannel(channel);
    return res.status(200).json(new ApiResponse(200, { templates }));
  }
  res.status(200).json(new ApiResponse(200, { templates: Object.values(TEMPLATE_CATALOG) }));
});

const previewTemplate = asyncHandler(async (req, res) => {
  const { templateId, variables } = req.body;
  const template = TEMPLATE_CATALOG[templateId];

  if (!template) {
    throw new ApiError(404, 'Template not found in catalog.');
  }

  const renderedSubject = renderTemplate(template.subject, variables);
  const renderedBody = renderTemplate(template.templateText, variables);

  res.status(200).json(
    new ApiResponse(200, {
      templateId,
      renderedSubject,
      renderedBody,
    })
  );
});

const sendOutboundEmail = asyncHandler(async (req, res) => {
  const { to, subject, htmlBody, textBody, leadId, studentId, taskId, branch } = req.body;

  // 1. Role-based check (Defense-in-depth)
  const ALLOWED_EMAIL_ROLES = [
    ROLES.SUPER_ADMIN,
    ROLES.BRANCH_MANAGER,
    ROLES.COUNSELLOR,
    ROLES.APPLICATION_OFFICER,
  ];

  if (!req.user || !ALLOWED_EMAIL_ROLES.includes(req.user.role)) {
    throw new ApiError(403, 'Access denied: Your role is not authorized to dispatch outbound emails.');
  }

  // 2. Recipient email validation & injection mitigation
  if (!to || typeof to !== 'string' || to.length > 254) {
    throw new ApiError(400, 'Recipient email is required and must be under 255 characters.');
  }

  if (/[\r\n\0\t<>]/.test(to)) {
    throw new ApiError(400, 'Invalid recipient email: Prohibited characters or header injection detected.');
  }

  const cleanTo = to.trim().toLowerCase();
  if (!EMAIL_REGEX.test(cleanTo)) {
    throw new ApiError(400, 'Invalid recipient email format.');
  }

  // 3. Subject validation & header injection prevention
  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    throw new ApiError(400, 'Email subject is required.');
  }

  if (subject.length > 200) {
    throw new ApiError(400, 'Email subject cannot exceed 200 characters.');
  }

  if (/[\r\n\0]/.test(subject)) {
    throw new ApiError(400, 'Invalid subject: Email subjects cannot contain carriage returns, newlines, or null bytes.');
  }

  const cleanSubject = subject.trim();

  // 4. Content validation
  if (!htmlBody && !textBody) {
    throw new ApiError(400, 'Email content (htmlBody or textBody) is required.');
  }

  // 5. Candidate resolution, branch isolation, and recipient ownership verification
  const { candidate, targetBranch } = await resolveAndAuthorizeCandidate({
    user: req.user,
    leadId,
    studentId,
    toEmail: cleanTo,
  });

  const cleanHtml = htmlBody ? sanitizeHtmlContent(htmlBody) : '';
  const dedupKey = generateDedupKey('email', `${cleanTo}_${taskId || studentId || leadId}`);

  // 6. SMTP Dispatch with error handling & audit logging
  let deliveryResult;
  try {
    deliveryResult = await emailAdapter.sendEmail({
      to: cleanTo,
      subject: cleanSubject,
      htmlBody: cleanHtml,
      textBody,
      leadId,
      studentId,
    });
  } catch (deliveryErr) {
    await CommunicationActivity.create({
      channel: 'email',
      direction: 'outbound',
      recipient: cleanTo,
      leadId: leadId || null,
      studentId: studentId || null,
      taskId: taskId || null,
      actorId: req.user._id,
      actorName: req.user.name,
      branch: targetBranch,
      status: 'failed',
      notes: `Delivery failed: ${deliveryErr.message || 'SMTP error'}. Subject: ${cleanSubject}`,
      dedupKey,
    }).catch(() => null);

    throw new ApiError(500, `Email delivery failed: ${deliveryErr.message || 'SMTP transmission error'}`);
  }

  // 7. Successful / Dry-run audit logging
  const activity = await CommunicationActivity.create({
    channel: 'email',
    direction: 'outbound',
    recipient: cleanTo,
    leadId: leadId || null,
    studentId: studentId || null,
    taskId: taskId || null,
    actorId: req.user._id,
    actorName: req.user.name,
    branch: targetBranch,
    status: deliveryResult.status || 'sent',
    providerMessageId: deliveryResult.messageId || null,
    notes: `Subject: ${cleanSubject}`,
    dedupKey,
  }).catch(() => null);

  res.status(200).json(
    new ApiResponse(200, {
      delivery: deliveryResult,
      activityId: activity?._id || null,
    })
  );
});

const sendOutboundWhatsApp = asyncHandler(async (req, res) => {
  const { to, templateId, leadId, studentId, taskId, branch } = req.body;

  if (!to || !templateId) {
    throw new ApiError(400, 'Recipient phone and templateId are required.');
  }

  const targetBranch =
    req.user.branch !== BRANCHES.ALL ? req.user.branch : branch || BRANCHES.BENGALURU;

  const dedupKey = generateDedupKey('whatsapp', `${to}_${taskId || studentId || leadId}`);

  const deliveryResult = await sendCloudWhatsAppMessage({
    to,
    templateId,
  });

  const activity = await CommunicationActivity.create({
    channel: 'whatsapp',
    direction: 'outbound',
    recipient: to,
    leadId: leadId || null,
    studentId: studentId || null,
    taskId: taskId || null,
    actorId: req.user._id,
    actorName: req.user.name,
    branch: targetBranch,
    status: deliveryResult.status,
    providerMessageId: deliveryResult.messageId,
    notes: `Template: ${templateId}`,
    dedupKey,
  }).catch(() => null);

  res.status(200).json(
    new ApiResponse(200, {
      delivery: deliveryResult,
      activityId: activity?._id || null,
    })
  );
});

const getActivities = asyncHandler(async (req, res) => {
  const { branch, studentId, leadId, channel, page = 1, limit = 20 } = req.query;
  const filter = {};

  if (req.branchScope && req.branchScope !== 'all') {
    filter.branch = req.branchScope;
  } else if (branch && branch !== 'all') {
    filter.branch = branch;
  }

  if (studentId) filter.studentId = studentId;
  if (leadId) filter.leadId = leadId;
  if (channel) filter.channel = channel;

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const [activities, total] = await Promise.all([
    CommunicationActivity.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    CommunicationActivity.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      activities,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit) || 1,
      },
    })
  );
});

module.exports = {
  getTemplates,
  previewTemplate,
  sendOutboundEmail,
  sendOutboundWhatsApp,
  getActivities,
  resolveAndAuthorizeCandidate,
  sanitizeHtmlContent,
};
