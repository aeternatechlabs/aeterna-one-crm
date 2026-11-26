const { getEmailProvider } = require('./email.factory');
const { getResendConfigSummary } = require('./providers/resend.provider');
const { renderPasswordResetEmail } = require('./templates/password-reset.template');
const { renderOtpEmail } = require('./templates/otp.template');
const { renderEmployeeOnboardingEmail } = require('./templates/employee-onboarding.template');
const { renderNotificationEmail } = require('./templates/notification.template');

let _lastDispatchedEmailForTesting = null;

function getLastDispatchedEmailForTesting() {
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  return _lastDispatchedEmailForTesting;
}

function clearLastDispatchedEmailForTesting() {
  _lastDispatchedEmailForTesting = null;
}

async function sendEmail({ to, subject, html, text, providerOverride = null }) {
  const provider = getEmailProvider(providerOverride);

  if (process.env.NODE_ENV === 'test') {
    _lastDispatchedEmailForTesting = {
      to,
      subject,
      html,
      text,
      provider: provider.name,
      timestamp: Date.now(),
    };
  }

  return provider.sendEmail({ to, subject, html, text });
}

async function sendPasswordResetOTP(toEmail, otp, recipientName) {
  if (process.env.NODE_ENV !== 'production') {
    _lastDispatchedEmailForTesting = {
      to: toEmail,
      otp,
      recipientName: recipientName || toEmail.split('@')[0],
      type: 'password_reset_otp',
      timestamp: Date.now(),
    };
  }

  const html = renderPasswordResetEmail({
    otp,
    name: recipientName || toEmail.split('@')[0],
    expiryMinutes: 15,
  });

  return sendEmail({
    to: toEmail,
    subject: 'Your 6-Digit Password Reset Code — Aeterna One CRM',
    html,
  });
}

async function send2FAOTP(toEmail, otp, recipientName, purpose = 'Two-Factor Authentication') {
  if (process.env.NODE_ENV !== 'production') {
    _lastDispatchedEmailForTesting = {
      to: toEmail,
      otp,
      recipientName: recipientName || toEmail.split('@')[0],
      type: 'two_factor_otp',
      purpose,
      timestamp: Date.now(),
    };
  }

  const html = renderOtpEmail({
    otp,
    name: recipientName || toEmail.split('@')[0],
    purpose,
    expiryMinutes: 10,
  });

  return sendEmail({
    to: toEmail,
    subject: `Your ${purpose} Code — Aeterna One CRM`,
    html,
  });
}

async function sendEmployeeOnboardingEmail({ toEmail, recipientName, tempPassword, role, branch, employeeCode }) {
  if (process.env.NODE_ENV === 'test') {
    _lastDispatchedEmailForTesting = {
      to: toEmail,
      recipientName: recipientName || toEmail.split('@')[0],
      tempPassword,
      role,
      branch,
      employeeCode,
      type: 'employee_onboarding',
      timestamp: Date.now(),
    };
  }

  const html = renderEmployeeOnboardingEmail({
    name: recipientName || toEmail.split('@')[0],
    tempPassword,
    role,
    branch,
    employeeCode,
  });

  return sendEmail({
    to: toEmail,
    subject: 'Welcome to Aeterna One — Your Workspace Account & Temporary Credentials',
    html,
  });
}

async function sendNotificationEmail({ toEmail, title, message, recipientName, actionUrl, actionText }) {
  const html = renderNotificationEmail({
    title,
    message,
    recipientName: recipientName || toEmail.split('@')[0],
    actionUrl,
    actionText,
  });

  return sendEmail({
    to: toEmail,
    subject: title || 'Aeterna One Notification',
    html,
  });
}

async function getEmailConfigSummary() {
  return await getResendConfigSummary();
}

async function testEmailConnection() {
  const provider = getEmailProvider();
  const summary = provider.getConfigSummary();
  return {
    connected: summary.isConfigured,
    provider: provider.name,
    senderEmail: summary.senderEmail || process.env.EMAIL_FROM || 'admissions@aeterna.com',
    message: summary.isConfigured
      ? `Email provider "${provider.name}" is configured and active.`
      : `Email provider "${provider.name}" is running in unconfigured/dry-run mode.`,
  };
}

module.exports = {
  sendEmail,
  sendPasswordResetOTP,
  send2FAOTP,
  sendEmployeeOnboardingEmail,
  sendNotificationEmail,
  getEmailConfigSummary,
  testEmailConnection,
  getLastDispatchedEmailForTesting,
  clearLastDispatchedEmailForTesting,
};
