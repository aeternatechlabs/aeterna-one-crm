const { ResendEmailProvider } = require('./providers/resend.provider');
const { GmailRollbackProvider } = require('./providers/gmail.provider');

class DevelopmentSimulatorProvider {
  constructor() {
    this.name = 'development';
  }

  isConfigured() {
    return false;
  }

  getConfigSummary() {
    return {
      provider: 'development_relay',
      isConfigured: false,
      senderEmail: process.env.EMAIL_FROM || process.env.EMAIL_SENDER || 'admissions@aeterna.com',
      senderName: process.env.EMAIL_SENDER_NAME || 'Aeterna Education Consultancy',
    };
  }

  async sendEmail({ to, subject }) {
    if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_EMAIL_CONSOLE_LOG === 'true') {
      console.log('='.repeat(65));
      console.log(`✉ [Aeterna Email Dispatch Simulator]`);
      console.log(`  To      : ${to}`);
      console.log(`  Subject : ${subject.replace(/\d{6}/g, '******')}`);
      console.log(`  Status  : Dispatched via Development Relay`);
      console.log('='.repeat(65));
    }
    return {
      success: true,
      provider: 'development-simulator',
      status: 'accepted',
      messageId: `sim_${Date.now()}`,
      recipient: to,
    };
  }
}

function getEmailProvider(overrideProvider = null) {
  const providerName = (overrideProvider || process.env.EMAIL_PROVIDER || '').toLowerCase().trim();

  if (providerName === 'development' || providerName === 'simulator') {
    return new DevelopmentSimulatorProvider();
  }

  if (providerName === 'gmail') {
    return new GmailRollbackProvider();
  }

  if (providerName === 'resend') {
    return new ResendEmailProvider();
  }

  if (process.env.RESEND_API_KEY) {
    return new ResendEmailProvider();
  }

  return new DevelopmentSimulatorProvider();
}

module.exports = {
  getEmailProvider,
  ResendEmailProvider,
  GmailRollbackProvider,
  DevelopmentSimulatorProvider,
};
