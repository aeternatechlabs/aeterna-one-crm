const { escapeHtml } = require('./otp.template');

const renderPasswordResetEmail = ({ otp, name = 'Valued Team Member', expiryMinutes = 15, resetUrl = '' }) => {
  const safeName = escapeHtml(name);
  const safeOtp = escapeHtml(String(otp || ''));

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Password Reset Code</title>
  <style>
    body { margin: 0; padding: 0; background-color: #faf7f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; }
    .wrapper { width: 100%; background-color: #faf7f2; padding: 30px 15px; box-sizing: border-box; }
    .container { max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #ebd9c8; box-shadow: 0 4px 20px rgba(90, 12, 30, 0.06); }
    .header { background: linear-gradient(135deg, #5a0c1e 0%, #3e0714 100%); padding: 32px 24px; text-align: center; border-bottom: 3px solid #9a6a24; }
    .brand-title { color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: 2px; margin: 0; text-transform: uppercase; }
    .brand-subtitle { color: #ebd9c8; font-size: 11px; letter-spacing: 3px; margin-top: 6px; text-transform: uppercase; font-weight: 500; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 12px; }
    .lead-text { font-size: 14px; line-height: 1.6; color: #4b5563; margin-bottom: 24px; }
    .otp-card { background-color: #faf7f2; border: 1.5px dashed #9a6a24; border-radius: 8px; padding: 24px 16px; text-align: center; margin: 24px 0; }
    .otp-label { font-size: 11px; font-weight: 700; color: #9a6a24; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; }
    .otp-digits { font-family: monospace; font-size: 34px; font-weight: 800; color: #5a0c1e; letter-spacing: 12px; margin: 4px 0; padding-left: 12px; }
    .otp-expiry { font-size: 12px; color: #6b7280; margin-top: 8px; }
    .advisory-card { background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 0 6px 6px 0; margin-top: 24px; }
    .advisory-text { font-size: 12px; color: #92400e; line-height: 1.5; margin: 0; }
    .footer { background-color: #f9fafb; padding: 20px 24px; border-top: 1px solid #f3f4f6; text-align: center; font-size: 12px; color: #9ca3af; line-height: 1.5; }
    .footer-brand { color: #5a0c1e; font-weight: 600; }
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
        <div class="greeting">Hello ${safeName},</div>
        <p class="lead-text">
          A request has been initiated to reset the password for your Aeterna One CRM account. Use the 6-digit verification code below to authorize this password reset:
        </p>
        <div class="otp-card">
          <div class="otp-label">Password Reset Verification Code</div>
          <div class="otp-digits">${safeOtp}</div>
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

module.exports = {
  renderPasswordResetEmail,
};
