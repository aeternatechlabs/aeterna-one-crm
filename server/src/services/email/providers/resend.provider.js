const { Resend } = require('resend');
const mongoose = require('mongoose');

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new Error('Recipient email address must be a valid non-empty string.');
  }
  const cleanEmail = email.trim();
  if (cleanEmail.includes('\r') || cleanEmail.includes('\n')) {
    throw new Error('Invalid recipient email address: Header injection detected.');
  }
  if (!EMAIL_REGEX.test(cleanEmail)) {
    throw new Error(`Invalid recipient email format: "${cleanEmail}".`);
  }
  return cleanEmail;
}

function sanitizeSubject(subject) {
  if (!subject || typeof subject !== 'string') {
    return 'Aeterna One Notification';
  }
  return subject.replace(/[\r\n]+/g, ' ').trim();
}

function classifyResendError(error) {
  const statusCode = error.statusCode || error.status || (error.response && error.response.status);
  const message = error.message || 'Unknown Resend API error';

  if (statusCode === 429) {
    const err = new Error(`Resend Rate Limit Exceeded: ${message}`);
    err.name = 'RateLimitError';
    err.statusCode = 429;
    err.retryable = true;
    return err;
  }
  if (statusCode === 401 || statusCode === 403) {
    const err = new Error(`Resend Authentication Failed: ${message}`);
    err.name = 'AuthenticationError';
    err.statusCode = statusCode;
    err.retryable = false;
    return err;
  }
  if (statusCode === 422) {
    const err = new Error(`Resend Validation Error: ${message}`);
    err.name = 'ResendValidationError';
    err.statusCode = 422;
    err.retryable = false;
    return err;
  }
  if (statusCode >= 500) {
    const err = new Error(`Resend Service Unavailable (${statusCode}): ${message}`);
    err.name = 'ServiceUnavailableError';
    err.statusCode = statusCode;
    err.retryable = true;
    return err;
  }

  const err = new Error(`Resend Dispatch Error: ${message}`);
  err.name = 'ResendProviderError';
  err.statusCode = statusCode || 500;
  err.retryable = false;
  return err;
}

async function getActiveResendRecord() {
  if (mongoose.connection && mongoose.connection.readyState !== 0) {
    try {
      const ResendIntegration = require('../../modules/settings/resendIntegration.model');
      return await ResendIntegration.findOne({ provider: 'resend', isConnected: true });
    } catch (_) {
      return null;
    }
  }
  return null;
}

async function connectResendConfig({ apiKey, fromEmail, fromName }, userId = null) {
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new Error('Resend API key is required (e.g. re_123456789)');
  }
  if (!fromEmail || typeof fromEmail !== 'string' || !EMAIL_REGEX.test(fromEmail.trim())) {
    throw new Error('Valid sender email address is required (e.g. noreply@yourdomain.com)');
  }

  const cleanKey = apiKey.trim();
  const cleanEmail = fromEmail.trim().toLowerCase();
  const cleanName = (fromName || 'Aeterna Education Consultancy').trim();

  process.env.RESEND_API_KEY = cleanKey;
  process.env.EMAIL_FROM = cleanEmail;
  process.env.EMAIL_SENDER_NAME = cleanName;
  process.env.EMAIL_PROVIDER = 'resend';

  if (mongoose.connection && mongoose.connection.readyState !== 0) {
    const ResendIntegration = require('../../modules/settings/resendIntegration.model');
    let record = await ResendIntegration.findOne({ provider: 'resend' });
    if (!record) {
      record = new ResendIntegration({
        provider: 'resend',
        apiKey: cleanKey,
        fromEmail: cleanEmail,
        fromName: cleanName,
        isConnected: true,
        connectedBy: userId,
        connectedAt: new Date(),
      });
    } else {
      record.apiKey = cleanKey;
      record.fromEmail = cleanEmail;
      record.fromName = cleanName;
      record.isConnected = true;
      record.connectedBy = userId || record.connectedBy;
      record.connectedAt = new Date();
    }
    await record.save();
    return {
      provider: 'resend',
      senderEmail: record.fromEmail,
      senderName: record.fromName,
      isConnected: true,
      apiKeyMasked: record.getMaskedApiKey(),
      connectedAt: record.connectedAt,
    };
  }

  return {
    provider: 'resend',
    senderEmail: cleanEmail,
    senderName: cleanName,
    isConnected: true,
    apiKeyMasked: `${cleanKey.slice(0, 5)}...${cleanKey.slice(-4)}`,
    connectedAt: new Date(),
  };
}

async function disconnectResendConfig() {
  delete process.env.RESEND_API_KEY;

  if (mongoose.connection && mongoose.connection.readyState !== 0) {
    const ResendIntegration = require('../../modules/settings/resendIntegration.model');
    const record = await ResendIntegration.findOne({ provider: 'resend', isConnected: true });
    if (record) {
      record.isConnected = false;
      await record.save();
    }
  }

  return { success: true, message: 'Resend email configuration disconnected successfully' };
}

async function getResendConfigSummary() {
  const dbRecord = await getActiveResendRecord();

  const apiKey = dbRecord?.apiKey || process.env.RESEND_API_KEY || '';
  const fromEmail = dbRecord?.fromEmail || process.env.EMAIL_FROM || process.env.RESEND_FROM || process.env.EMAIL_SENDER || 'noreply@aeterna.com';
  const fromName = dbRecord?.fromName || process.env.EMAIL_SENDER_NAME || 'Aeterna Education Consultancy';
  const isConnected = Boolean(dbRecord ? dbRecord.isConnected : apiKey);

  return {
    provider: 'resend',
    isConfigured: Boolean(apiKey && apiKey.trim()),
    isConnected,
    senderEmail: fromEmail,
    senderName: fromName,
    apiKeyMasked: apiKey
      ? `${apiKey.slice(0, 5)}...${apiKey.slice(-4)}`
      : 'Not Configured',
    totalEmailsSent: dbRecord?.totalEmailsSent || 0,
    connectedAt: dbRecord?.connectedAt || null,
  };
}

class ResendEmailProvider {
  constructor(options = {}) {
    this.name = 'resend';
    this.apiKey = options.apiKey || process.env.RESEND_API_KEY || '';
    this.from = options.from || process.env.EMAIL_FROM || process.env.RESEND_FROM || process.env.EMAIL_SENDER || 'noreply@aeterna.com';
    this.senderName = options.senderName || process.env.EMAIL_SENDER_NAME || 'Aeterna Education Consultancy';
    this.client = options.client || (this.apiKey ? new Resend(this.apiKey) : null);
    this.maxRetries = options.maxRetries !== undefined ? options.maxRetries : 2;
    this.timeoutMs = options.timeoutMs || 10000;
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim());
  }

  getConfigSummary() {
    return {
      provider: 'resend',
      isConfigured: this.isConfigured(),
      isConnected: this.isConfigured(),
      senderEmail: this.from,
      senderName: this.senderName,
      apiKeyMasked: this.apiKey
        ? `${this.apiKey.slice(0, 5)}...${this.apiKey.slice(-4)}`
        : 'Not Configured',
    };
  }

  async sendEmail({ to, subject, html, text }) {
    if (!this.apiKey && mongoose.connection && mongoose.connection.readyState !== 0) {
      const dbRecord = await getActiveResendRecord();
      if (dbRecord && dbRecord.apiKey) {
        this.apiKey = dbRecord.apiKey;
        this.from = dbRecord.fromEmail || this.from;
        this.senderName = dbRecord.fromName || this.senderName;
        this.client = new Resend(this.apiKey);
      }
    }

    if (!this.isConfigured()) {
      throw new Error(
        'Resend API key is not configured. Set RESEND_API_KEY in server environment before selecting EMAIL_PROVIDER=resend.'
      );
    }

    const cleanTo = validateEmail(to);
    const cleanSubject = sanitizeSubject(subject);

    let cleanFrom = (this.from || 'noreply@aeterna.com').trim();
    if (!cleanFrom.includes('@')) {
      cleanFrom = `noreply@${cleanFrom}`;
    }

    const fromAddress = cleanFrom.includes('<')
      ? cleanFrom
      : `${this.senderName} <${cleanFrom}>`;

    if (!html && !text) {
      throw new Error('Email body is required: either html or text must be provided.');
    }

    const payload = {
      from: fromAddress,
      to: [cleanTo],
      subject: cleanSubject,
      html: html || undefined,
      text: text || undefined,
    };

    let attempt = 0;
    let lastError = null;

    while (attempt <= this.maxRetries) {
      attempt++;
      try {
        const client = this.client || new Resend(this.apiKey);
        const sendPromise = client.emails.send(payload);

        let timeoutHandle;
        const timeoutPromise = new Promise((_, reject) => {
          timeoutHandle = setTimeout(() => {
            const err = new Error(`Resend API call timed out after ${this.timeoutMs}ms`);
            err.name = 'TimeoutError';
            err.statusCode = 504;
            err.retryable = true;
            reject(err);
          }, this.timeoutMs);
        });

        const { data, error } = await Promise.race([sendPromise, timeoutPromise]).finally(() => {
          clearTimeout(timeoutHandle);
        });

        if (error) {
          throw classifyResendError(error);
        }

        if (!data || !data.id) {
          throw new Error('Resend API accepted request but returned no message identifier.');
        }

        if (mongoose.connection && mongoose.connection.readyState !== 0) {
          getActiveResendRecord().then((record) => {
            if (record) {
              record.totalEmailsSent = (record.totalEmailsSent || 0) + 1;
              record.lastTestAt = new Date();
              record.save().catch(() => {});
            }
          }).catch(() => {});
        }

        if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_EMAIL_CONSOLE_LOG === 'true') {
          const maskedSubject = cleanSubject.replace(/\d{6}/g, '******');
          console.log(`✉ [Resend Dispatch Accepted] ID: ${data.id} | To: ${cleanTo} | Subject: ${maskedSubject}`);
        }

        return {
          success: true,
          provider: 'resend',
          status: 'accepted',
          messageId: data.id,
          recipient: cleanTo,
        };
      } catch (err) {
        lastError = classifyResendError(err);

        if (!lastError.retryable || attempt > this.maxRetries) {
          break;
        }

        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
        console.warn(`[ResendProvider] Transient error (${lastError.message}). Retrying attempt ${attempt}/${this.maxRetries} in ${backoffMs}ms...`);
        await new Promise((res) => setTimeout(res, backoffMs));
      }
    }

    throw lastError;
  }
}

module.exports = {
  ResendEmailProvider,
  validateEmail,
  sanitizeSubject,
  classifyResendError,
  connectResendConfig,
  disconnectResendConfig,
  getResendConfigSummary,
};
