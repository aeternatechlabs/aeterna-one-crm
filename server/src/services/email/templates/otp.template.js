function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const renderOtpEmail = ({ otp, name = 'Valued User', purpose = 'Account Verification', expiryMinutes = 15 }) => {
  const safeName = escapeHtml(name);
  const safeOtp = escapeHtml(String(otp || ''));
  const safePurpose = escapeHtml(purpose);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safePurpose} Code</title>
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
          Use the 6-digit authentication code below to complete your ${safePurpose}:
        </p>
        <div class="otp-card">
          <div class="otp-label">${safePurpose} Code</div>
          <div class="otp-digits">${safeOtp}</div>
          <div class="otp-expiry">&bull; Valid for the next ${expiryMinutes} minutes &bull;</div>
        </div>
        <p class="lead-text" style="font-size: 12px; color: #92400e;">
          <strong>Security Notice:</strong> If you did not initiate this request, please contact your CRM administrator immediately.
        </p>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} <span class="footer-brand">Aeterna Education Consultancy</span> &bull; Bengaluru &bull; Mysuru &bull; Belagavi
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

module.exports = {
  renderOtpEmail,
  escapeHtml,
};
