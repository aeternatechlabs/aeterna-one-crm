const Document = require('../vault/document.model');
const { getR2ConfigSummary, testR2Connection } = require('../vault/storage.service');
const { getBrevoConfigSummary, testBrevoConnection, sendEmail } = require('../../services/emailService');
const { asyncHandler, ApiResponse, ApiError } = require('../../utils/devilWrapper');

/**
 * 1. Get Cloud Integrations Status & Document Storage Statistics
 * GET /api/v1/settings/integrations
 * Access: Super Admin Only
 */
const getIntegrationSettings = asyncHandler(async (req, res) => {
  const r2Summary = getR2ConfigSummary();
  const brevoSummary = getBrevoConfigSummary();

  // Aggregate document storage stats across all branches
  const [docStats, categoryBreakdown] = await Promise.all([
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
  ]);

  const activeStats = docStats.find((s) => s._id === false) || { count: 0, totalBytes: 0, verifiedCount: 0 };
  const trashedStats = docStats.find((s) => s._id === true) || { count: 0, totalBytes: 0, verifiedCount: 0 };

  const providerCounts = {
    cloudflare_r2: 0,
    local: 0,
  };
  categoryBreakdown.forEach((b) => {
    if (b._id === 'cloudflare_r2') providerCounts.cloudflare_r2 = b.count;
    else providerCounts.local += b.count;
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        brevo: brevoSummary,
        cloudflareR2: r2Summary,
        storageMetrics: {
          activeDocuments: activeStats.count,
          trashedDocuments: trashedStats.count,
          totalStorageBytes: activeStats.totalBytes,
          verifiedDocuments: activeStats.verifiedCount,
          providerBreakdown: providerCounts,
        },
      },
      'Cloud integrations and storage configuration retrieved successfully'
    )
  );
});

/**
 * 2. Send Live Test Email to Verify Brevo Integration
 * POST /api/v1/settings/test-email
 * Access: Super Admin Only
 */
const testEmailDispatch = asyncHandler(async (req, res) => {
  const { testEmail } = req.body;
  const targetEmail = testEmail || req.user.email || 'admin@aeterna.com';

  const testSubject = `Aeterna One — Brevo Integration Test Dispatch [${Date.now().toString().slice(-4)}]`;
  const testHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #ebd9c8; border-radius: 8px; background-color: #faf7f2;">
      <h2 style="color: #5a0c1e; margin-top: 0;">Aeterna One CRM &bull; Integration Verified</h2>
      <p style="color: #374151; font-size: 14px; line-height: 1.6;">
        This test email confirms that the Brevo Transactional Email Engine is successfully linked to your Aeterna One CRM server.
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

module.exports = {
  getIntegrationSettings,
  testEmailDispatch,
  testStorageConnection,
};
