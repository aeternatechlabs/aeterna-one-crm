const { rawDevil } = require('../utils/devilWrapper');

/**
 * Aeterna One Luxury Responsive HTML Email Template Generator
 * Follows Karnataka heritage aesthetic: Royal Maroon (#5a0c1e), Warm Cream (#faf7f2), Rich Gold (#9a6a24)
 */
const renderPasswordResetEmail = ({ otp, name = 'Valued Team Member', expiryMinutes = 15 }) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Password Reset Code</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #faf7f2;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1f2937;
    }
    .wrapper {
      width: 100%;
      background-color: #faf7f2;
      padding: 30px 15px;
      box-sizing: border-box;
    }
    .container {
      max-width: 540px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #ebd9c8;
      box-shadow: 0 4px 20px rgba(90, 12, 30, 0.06);
    }
    .header {
      background: linear-gradient(135deg, #5a0c1e 0%, #3e0714 100%);
      padding: 32px 24px;
      text-align: center;
      border-bottom: 3px solid #9a6a24;
    }
    .brand-title {
      color: #ffffff;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 2px;
      margin: 0;
      text-transform: uppercase;
    }
    .brand-subtitle {
      color: #ebd9c8;
      font-size: 11px;
      letter-spacing: 3px;
      margin-top: 6px;
      text-transform: uppercase;
      font-weight: 500;
    }
    .content {
      padding: 32px 28px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 12px;
    }
    .lead-text {
      font-size: 14px;
      line-height: 1.6;
      color: #4b5563;
      margin-bottom: 24px;
    }
    .otp-card {
      background-color: #faf7f2;
      border: 1.5px dashed #9a6a24;
      border-radius: 8px;
      padding: 24px 16px;
      text-align: center;
      margin: 24px 0;
    }
    .otp-label {
      font-size: 11px;
      font-weight: 700;
      color: #9a6a24;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 8px;
    }
    .otp-digits {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 34px;
      font-weight: 800;
      color: #5a0c1e;
      letter-spacing: 12px;
      margin: 4px 0;
      padding-left: 12px;
    }
    .otp-expiry {
      font-size: 12px;
      color: #6b7280;
      margin-top: 8px;
    }
    .advisory-card {
      background-color: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      border-radius: 0 6px 6px 0;
      margin-top: 24px;
    }
    .advisory-text {
      font-size: 12px;
      color: #92400e;
      line-height: 1.5;
      margin: 0;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px 24px;
      border-top: 1px solid #f3f4f6;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
      line-height: 1.5;
    }
    .footer-brand {
      color: #5a0c1e;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="brand-title">Aeterna One</h1>
        <div class="brand-subtitle">— Study Abroad CRM &bull; Karnataka Hubs —</div>
      </div>
      <div class="content">
        <div class="greeting">Hello ${name},</div>
        <p class="lead-text">
          A request has been initiated to reset the password for your Aeterna One CRM account. Use the 6-digit verification code below to authorize this password reset:
        </p>

        <div class="otp-card">
          <div class="otp-label">Password Reset Verification Code</div>
          <div class="otp-digits">${otp}</div>
          <div class="otp-expiry">&bull; Valid for the next ${expiryMinutes} minutes &bull;</div>
        </div>

        <p class="lead-text" style="margin-bottom: 0;">
          Enter this verification code in the CRM Forgot Password prompt, then choose a secure new password satisfying our system complexity requirements.
        </p>

        <div class="advisory-card">
          <p class="advisory-text">
            <strong>Security Notice:</strong> If you did not request this verification code, please ignore this email or notify your system administrator immediately. Your credentials remain safe and no changes have been applied.
          </p>
        </div>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} <span class="footer-brand">Aeterna Education Consultancy</span> &bull; Bengaluru &bull; Mysuru &bull; Belagavi<br>
        This is an automated security dispatch. Please do not reply directly to this email.
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Checks whether Brevo credentials are fully configured
 */
function isBrevoConfigured() {
  return Boolean(process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.trim());
}

/**
 * Returns sanitized Brevo configuration metadata for UI & admin inspection
 */
function getBrevoConfigSummary() {
  const apiKey = process.env.BREVO_API_KEY || '';
  return {
    isConfigured: isBrevoConfigured(),
    provider: isBrevoConfigured() ? 'brevo_v3' : 'development_relay',
    senderEmail: process.env.BREVO_SENDER_EMAIL || 'admissions@aeterna.com',
    senderName: process.env.BREVO_SENDER_NAME || 'Aeterna Education Consultancy',
    apiKeyMasked: apiKey ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}` : 'Not Configured',
  };
}

/**
 * Dispatches transactional email directly via Brevo v3 REST API
 */
async function dispatchViaBrevoV3(to, subject, htmlContent) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'admissions@aeterna.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'Aeterna Education Consultancy';

  const payload = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: to }],
    subject,
    htmlContent,
  };

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(`Brevo API Error (HTTP ${response.status}): ${errorJson.message || response.statusText}`);
  }

  const data = await response.json();
  return { messageId: data.messageId };
}

/**
 * Dispatches an email via Brevo or safe development logging
 */
const sendEmail = async ({ to, subject, html }) => {
  // 1. Try devil-backend-nodejs sendBrevo helper if available
  if (isBrevoConfigured() && rawDevil?.sendBrevo && typeof rawDevil.sendBrevo === 'function') {
    try {
      const result = await rawDevil.sendBrevo(to, subject, html);
      if (result && !result.error) {
        return { success: true, provider: 'brevo_package', result };
      }
    } catch (err) {
      console.warn(`[EmailService] devil-backend sendBrevo notice (${err.message}). Trying native Brevo v3 endpoint.`);
    }
  }

  // 2. Direct Brevo v3 REST API
  if (isBrevoConfigured()) {
    try {
      const result = await dispatchViaBrevoV3(to, subject, html);
      return { success: true, provider: 'brevo_v3_direct', result };
    } catch (err) {
      console.warn(`[EmailService] Direct Brevo v3 dispatch notice (${err.message}). Falling back to development audit logger.`);
    }
  }

  // 3. Safe development / fallback mode
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_EMAIL_CONSOLE_LOG === 'true') {
    console.log('='.repeat(65));
    console.log(`✉ [Aeterna Email Dispatch Simulator]`);
    console.log(`  To      : ${to}`);
    console.log(`  Subject : ${subject}`);
    console.log(`  Status  : Dispatched via Development Relay`);
    console.log('='.repeat(65));
  }

  return { success: true, provider: 'development-simulator' };
};

/**
 * Tests Brevo API connectivity and account status
 */
async function testBrevoConnection() {
  if (!isBrevoConfigured()) {
    return {
      connected: false,
      provider: 'development-simulator',
      message: 'BREVO_API_KEY is not configured. Running in local development simulator mode.',
    };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/account', {
      method: 'GET',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      return {
        connected: false,
        error: errorJson.message || `HTTP ${response.status}`,
        message: `Brevo API verification failed: ${errorJson.message || response.statusText}`,
      };
    }

    const account = await response.json();
    return {
      connected: true,
      provider: 'brevo',
      email: account.email,
      companyName: account.companyName,
      message: `Brevo API successfully connected (Account: ${account.email}). Ready for transactional email dispatches.`,
    };
  } catch (err) {
    return {
      connected: false,
      error: err.message,
      message: `Brevo API connection error: ${err.message}`,
    };
  }
}

/**
 * Dispatches 6-Digit Password Reset OTP Email
 */
const sendPasswordResetOTP = async (toEmail, otp, recipientName) => {
  const html = renderPasswordResetEmail({
    otp,
    name: recipientName || toEmail.split('@')[0],
    expiryMinutes: 15,
  });

  return sendEmail({
    to: toEmail,
    subject: `Your 6-Digit Password Reset Code — Aeterna One CRM [${otp}]`,
    html,
  });
};

module.exports = {
  renderPasswordResetEmail,
  sendEmail,
  sendPasswordResetOTP,
  isBrevoConfigured,
  getBrevoConfigSummary,
  testBrevoConnection,
};
