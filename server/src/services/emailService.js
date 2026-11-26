const emailModule = require('./email');

module.exports = {
  ...emailModule,
  getBrevoConfigSummary: emailModule.getEmailConfigSummary,
  testBrevoConnection: emailModule.testEmailConnection,
};
