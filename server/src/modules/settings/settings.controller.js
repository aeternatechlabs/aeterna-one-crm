const Document = require('../vault/document.model');
const { getR2ConfigSummary, testR2Connection } = require('../vault/storage.service');
const { getEmailConfigSummary, testEmailConnection, sendEmail } = require('../../services/emailService');
const {
  connectResendConfig,
  disconnectResendConfig,
  getResendConfigSummary,
} = require('../../services/email/providers/resend.provider');
const { asyncHandler, ApiResponse, ApiError } = require('../../utils/devilWrapper');

/**
 * 1. Get Cloud Integrations Status & Document Storage Statistics
 * GET /api/v1/settings/integrations
 * Access: Super Admin Only
 */
const getIntegrationSettings = asyncHandler(async (req, res) => {
  const r2Summary = getR2ConfigSummary();
  const emailSummary = await getEmailConfigSummary();

  // Aggregate document storage stats across all branches, categories, and providers
  const [docStats, providerAggregation, categoryStats, branchStats] = await Promise.all([
    Document.aggregate([
      {
        $group: {
          _id: '$isDeleted',
          count: { $sum: 1 },
          totalBytes: { $sum: '$fileSize' },
          verifiedCount: {
            $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] },
          },
        },
      },
    ]),
    Document.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$storageProvider',
          count: { $sum: 1 },
          totalBytes: { $sum: '$fileSize' },
        },
      },
    ]),
    Document.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalBytes: { $sum: '$fileSize' },
        },
      },
      { $sort: { totalBytes: -1 } },
    ]),
    Document.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$branch',
          count: { $sum: 1 },
          totalBytes: { $sum: '$fileSize' },
        },
      },
      { $sort: { totalBytes: -1 } },
    ]),
  ]);

  const activeStats = docStats.find((s) => s._id === false) || { count: 0, totalBytes: 0, verifiedCount: 0 };
  const trashedStats = docStats.find((s) => s._id === true) || { count: 0, totalBytes: 0, verifiedCount: 0 };

  const providerCounts = {
    cloudflare_r2: 0,
    local: 0,
  };
  providerAggregation.forEach((b) => {
    if (b._id === 'cloudflare_r2') providerCounts.cloudflare_r2 = b.count;
    else providerCounts.local += b.count;
  });

  const storageLimitGb = Number(process.env.R2_STORAGE_LIMIT_GB) || 10;
  const totalCapacityBytes = storageLimitGb * 1024 * 1024 * 1024;
  const usedBytes = activeStats.totalBytes || 0;
  const freeStorageBytes = Math.max(0, totalCapacityBytes - usedBytes);
  const usedPercentage = Number(((usedBytes / totalCapacityBytes) * 100).toFixed(2));

  const categoryBreakdownList = categoryStats.map((c) => ({
    category: c._id || 'other',
    count: c.count,
    totalBytes: c.totalBytes,
    mb: Number((c.totalBytes / (1024 * 1024)).toFixed(2)),
  }));

  const branchBreakdownList = branchStats.map((b) => ({
    branch: b._id || 'bengaluru',
    count: b.count,
    totalBytes: b.totalBytes,
    mb: Number((b.totalBytes / (1024 * 1024)).toFixed(2)),
  }));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        resend: emailSummary,
        email: emailSummary,
        cloudflareR2: r2Summary,
        storageMetrics: {
          activeDocuments: activeStats.count,
          trashedDocuments: trashedStats.count,
          totalStorageBytes: activeStats.totalBytes,
          verifiedDocuments: activeStats.verifiedCount,
          providerBreakdown: providerCounts,
          totalCapacityBytes,
          freeStorageBytes,
          usedPercentage,
          storageLimitGb,
          categoryBreakdown: categoryBreakdownList,
          branchBreakdown: branchBreakdownList,
        },
      },
      'Cloud integrations and storage configuration retrieved successfully'
    )
  );
});

/**
 * 2. Send Live Test Email to Verify Email Dispatcher
 * POST /api/v1/settings/test-email
 * Access: Super Admin Only
 */
const testEmailDispatch = asyncHandler(async (req, res) => {
  const { testEmail } = req.body;
  const targetEmail = testEmail || req.user.email || 'admin@aeterna.com';

  const testSubject = `Aeterna One — System Email Test Dispatch [${Date.now().toString().slice(-4)}]`;
  const testHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #ebd9c8; border-radius: 8px; background-color: #faf7f2;">
      <h2 style="color: #5a0c1e; margin-top: 0;">Aeterna One CRM &bull; Integration Verified</h2>
      <p style="color: #374151; font-size: 14px; line-height: 1.6;">
        This test email confirms that the System Transactional Email Engine is successfully linked to your Aeterna One CRM server.
      </p>
      <div style="background-color: #ffffff; border-left: 4px solid #9a6a24; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
        <span style="font-size: 12px; color: #9a6a24; font-weight: 700; text-transform: uppercase;">Dispatch Details</span><br>
        <span style="font-size: 13px; color: #1f2937;"><strong>Recipient:</strong> ${targetEmail}</span><br>
        <span style="font-size: 13px; color: #1f2937;"><strong>Timestamp:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</span>
      </div>
      <p style="color: #9ca3af; font-size: 11px; margin-bottom: 0;">
        &copy; ${new Date().getFullYear()} Aeterna Education Consultancy &bull; Bengaluru &bull; Mysuru &bull; Belagavi
      </p>
    </div>
  `;

  const dispatchResult = await sendEmail({
    to: targetEmail,
    subject: testSubject,
    html: testHtml,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        targetEmail,
        dispatchResult,
      },
      `Test email sent successfully via ${dispatchResult.provider}`
    )
  );
});

/**
 * 3. Test Cloudflare R2 Connectivity & Storage Permissions
 * POST /api/v1/settings/test-storage
 * Access: Super Admin Only
 */
const testStorageConnection = asyncHandler(async (req, res) => {
  const result = await testR2Connection();

  return res.status(200).json(
    new ApiResponse(
      200,
      result,
      result.connected
        ? 'Cloudflare R2 storage connection verified successfully'
        : 'Storage healthcheck completed (Local Vault Active)'
    )
  );
});

const connectResendController = asyncHandler(async (req, res) => {
  const { apiKey, fromEmail, senderEmail, fromName, displayName } = req.body;
  const targetEmail = fromEmail || senderEmail;
  const targetName = fromName || displayName;

  if (!apiKey || !targetEmail) {
    throw new ApiError(400, 'Both Resend API Key (e.g. re_123456) and Sender Email are required');
  }

  const record = await connectResendConfig(
    {
      apiKey,
      fromEmail: targetEmail,
      fromName: targetName,
    },
    req.user?._id
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        resend: record,
      },
      `Resend email service (${record.senderEmail}) successfully connected and configured`
    )
  );
});

const disconnectResendController = asyncHandler(async (req, res) => {
  await disconnectResendConfig();
  return res.status(200).json(
    new ApiResponse(200, {
      message: 'Resend email configuration disconnected successfully',
    })
  );
});

module.exports = {
  getIntegrationSettings,
  testEmailDispatch,
  testStorageConnection,
  connectResendController,
  disconnectResendController,
};
