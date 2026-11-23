const { asyncHandler, ApiError, ApiResponse } = require('../../utils/devilWrapper');
const {
  TEMPLATE_CATALOG,
  renderTemplate,
  getTemplatesByChannel,
} = require('./templateEngine');
const { sendEmail } = require('./emailAdapter');
const { sendCloudWhatsAppMessage } = require('./whatsappAdapter');
const CommunicationActivity = require('./activity.model');
const { generateDedupKey } = require('./retryHandler');
const { BRANCHES } = require('../../config/constants');

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

  if (!to || !subject || (!htmlBody && !textBody)) {
    throw new ApiError(400, 'Recipient email, subject, and content are required.');
  }

  const targetBranch =
    req.user.branch !== BRANCHES.ALL ? req.user.branch : branch || BRANCHES.BENGALURU;

  const dedupKey = generateDedupKey('email', `${to}_${taskId || studentId || leadId}`);

  const deliveryResult = await sendEmail({
    to,
    subject,
    htmlBody,
    textBody,
    leadId,
    studentId,
  });

  const activity = await CommunicationActivity.create({
    channel: 'email',
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
    notes: `Subject: ${subject}`,
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
};
