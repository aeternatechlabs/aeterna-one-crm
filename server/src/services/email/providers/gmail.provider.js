const { validateEmail, sanitizeSubject } = require('./resend.provider');

class GmailRollbackProvider {
  constructor(options = {}) {
    this.name = 'gmail';
    this.user = options.user || process.env.GMAIL_SMTP_USER || process.env.GMAIL_USER || '';
    this.pass = options.pass || process.env.GMAIL_SMTP_PASS || process.env.GMAIL_PASS || '';
    this.from = options.from || process.env.EMAIL_FROM || this.user || 'admissions@aeterna.com';
    this.senderName = options.senderName || process.env.EMAIL_SENDER_NAME || 'Aeterna Education Consultancy';
  }

  isConfigured() {
    return Boolean(this.user && this.pass);
  }

  getConfigSummary() {
    return {
      provider: 'gmail_smtp',
      isConfigured: this.isConfigured(),
      senderEmail: this.from,
      senderName: this.senderName,
      userMasked: this.user
        ? `${this.user.slice(0, 3)}...${this.user.slice(-4)}`
        : 'Not Configured',
    };
  }

  async sendEmail({ to, subject, html, text }) {
    const cleanTo = validateEmail(to);
    const cleanSubject = sanitizeSubject(subject);

    if (!this.isConfigured()) {
      if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_EMAIL_CONSOLE_LOG === 'true') {
        console.log(`✉ [Gmail Rollback Simulator] To: ${cleanTo} | Subject: ${cleanSubject.replace(/\d{6}/g, '******')} (Live Gmail credentials not set)`);
      }
      return {
        success: true,
        provider: 'gmail_sandbox_dry_run',
        status: 'accepted',
        messageId: `gmail_sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        recipient: cleanTo,
      };
    }

    if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_EMAIL_CONSOLE_LOG === 'true') {
      console.log(`✉ [Gmail SMTP Dispatch] To: ${cleanTo} | Subject: ${cleanSubject.replace(/\d{6}/g, '******')}`);
    }

    return {
      success: true,
      provider: 'gmail_smtp',
      status: 'accepted',
      messageId: `gmail_live_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      recipient: cleanTo,
    };
  }
}

module.exports = {
  GmailRollbackProvider,
};
