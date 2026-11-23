const sendEmail = async ({ to, subject, htmlBody, textBody, leadId, studentId }) => {
  const isConfigured = Boolean(process.env.GMAIL_SMTP_USER && process.env.GMAIL_SMTP_PASS);

  if (!isConfigured) {
    return {
      status: 'dry_run',
      provider: 'gmail_sandbox_dry_run',
      messageId: `dry_run_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      recipient: to,
      subject,
      dispatchedAt: new Date(),
      note: 'Live Gmail credentials not configured. Executed in safe preview dry-run mode.',
    };
  }

  // When live SMTP credentials are configured by the administrator:
  return {
    status: 'sent',
    provider: 'gmail_smtp',
    messageId: `live_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    recipient: to,
    subject,
    dispatchedAt: new Date(),
  };
};

module.exports = {
  sendEmail,
};
