const { escapeHtml } = require('./otp.template');

const renderEmployeeOnboardingEmail = ({ name = 'Valued Team Member', tempPassword, role, branch, employeeCode }) => {
  const safeName = escapeHtml(name);
  const safeTempPass = escapeHtml(tempPassword || '');
  const safeRole = escapeHtml(role || 'Staff');
  const safeBranch = escapeHtml(branch || 'Bengaluru');
  const safeCode = escapeHtml(employeeCode || 'N/A');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Aeterna One</title>
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
    .cred-card { background-color: #faf7f2; border: 1px solid #ebd9c8; border-radius: 8px; padding: 20px 24px; margin: 20px 0; }
    .cred-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0e6dc; font-size: 13px; }
    .cred-row:last-child { border-bottom: none; }
    .cred-label { color: #8c7e73; font-weight: 600; }
    .cred-val { color: #1f2937; font-weight: 700; font-family: monospace; }
    .notice { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; font-size: 12px; color: #92400e; border-radius: 4px; margin-top: 20px; line-height: 1.5; }
    .footer { background-color: #faf7f2; padding: 20px 24px; text-align: center; border-top: 1px solid #ebd9c8; font-size: 12px; color: #8c7e73; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="brand-title">Aeterna One</h1>
        <div class="brand-subtitle">CRM Staff Account Provisioning</div>
      </div>
      <div class="content">
        <div class="greeting">Welcome, ${safeName}!</div>
        <p class="lead-text">Your workspace staff account has been created. Use the credentials below to sign in:</p>
        <div class="cred-card">
          <div class="cred-row"><span class="cred-label">Employee Code:</span> <span class="cred-val">${safeCode}</span></div>
          <div class="cred-row"><span class="cred-label">Role:</span> <span class="cred-val">${safeRole}</span></div>
          <div class="cred-row"><span class="cred-label">Branch:</span> <span class="cred-val">${safeBranch}</span></div>
          <div class="cred-row"><span class="cred-label">Temporary Password:</span> <span class="cred-val">${safeTempPass}</span></div>
        </div>
        <div class="notice">
          <strong>Security Notice:</strong> This temporary password must be changed immediately upon your first login. You will not be able to access CRM features until you set your own permanent password.
        </div>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} Aeterna One CRM. Karnataka Heritage Excellence.
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

module.exports = {
  renderEmployeeOnboardingEmail,
};
