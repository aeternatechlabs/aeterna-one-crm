const emailService = require('./email.service');
const { getEmailProvider, ResendEmailProvider, GmailRollbackProvider } = require('./email.factory');
const { renderPasswordResetEmail } = require('./templates/password-reset.template');
const { renderOtpEmail } = require('./templates/otp.template');
const { renderEmployeeOnboardingEmail } = require('./templates/employee-onboarding.template');
const { renderNotificationEmail } = require('./templates/notification.template');

module.exports = {
  ...emailService,
  getEmailProvider,
  ResendEmailProvider,
  GmailRollbackProvider,
  renderPasswordResetEmail,
  renderOtpEmail,
  renderEmployeeOnboardingEmail,
  renderNotificationEmail,
};
