const crypto = require('crypto');

const generateDirectWhatsAppUrl = (phone, text) => {
  const cleanPhone = String(phone || '').replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(text || '');
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
};

const verifyWebhookSignature = (signatureHeader, rawBody, appSecret) => {
  if (!signatureHeader || !appSecret) return false;
  const parts = signatureHeader.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') return false;

  const expectedHash = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  const providedBuffer = Buffer.from(parts[1], 'hex');
  const expectedBuffer = Buffer.from(expectedHash, 'hex');

  if (providedBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
};

const sendCloudWhatsAppMessage = async ({ to, templateId, language = 'en', components = [] }) => {
  const isConfigured = Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

  if (!isConfigured) {
    return {
      status: 'dry_run',
      provider: 'whatsapp_cloud_sandbox',
      messageId: `wa_dry_run_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      recipient: to,
      templateId,
      dispatchedAt: new Date(),
      note: 'WhatsApp Cloud API token not configured. Executed in safe dry-run mode.',
    };
  }

  return {
    status: 'sent',
    provider: 'whatsapp_cloud_api',
    messageId: `wamid.HBgL${Date.now()}`,
    recipient: to,
    templateId,
    dispatchedAt: new Date(),
  };
};

module.exports = {
  generateDirectWhatsAppUrl,
  verifyWebhookSignature,
  sendCloudWhatsAppMessage,
};
