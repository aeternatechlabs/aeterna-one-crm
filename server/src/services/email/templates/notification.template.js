const { escapeHtml } = require('./otp.template');

const renderNotificationEmail = ({ title = 'CRM Notification', message = '', recipientName = 'Team Member', actionUrl = '', actionText = 'View in CRM' }) => {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  const safeName = escapeHtml(recipientName);
  const safeActionText = escapeHtml(actionText);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
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
    .action-btn { display: inline-block; background-color: #5a0c1e; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 16px; }
    .footer { background-color: #f9fafb; padding: 20px 24px; border-top: 1px solid #f3f4f6; text-align: center; font-size: 12px; color: #9ca3af; line-height: 1.5; }
    .footer-brand { color: #5a0c1e; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="brand-title">Aeterna One</h1>
        <div class="brand-subtitle">— Notification Dispatch —</div>
      </div>
      <div class="content">
        <div class="greeting">Hello ${safeName},</div>
        <p class="lead-text">${safeMessage}</p>
        ${actionUrl ? `<p style="text-align: center;"><a href="${escapeHtml(actionUrl)}" class="action-btn">${safeActionText}</a></p>` : ''}
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
  renderNotificationEmail,
};
