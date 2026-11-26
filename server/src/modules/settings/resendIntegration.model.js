const mongoose = require('mongoose');

const resendIntegrationSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      default: 'resend',
      immutable: true,
      index: true,
    },
    apiKey: {
      type: String,
      required: [true, 'Resend API key is required'],
      trim: true,
    },
    fromEmail: {
      type: String,
      required: [true, 'Sender email address is required'],
      trim: true,
      lowercase: true,
    },
    fromName: {
      type: String,
      trim: true,
      default: 'Aeterna Education Consultancy',
    },
    isConnected: {
      type: Boolean,
      default: true,
      index: true,
    },
    connectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    connectedAt: {
      type: Date,
      default: Date.now,
    },
    lastTestAt: {
      type: Date,
      default: null,
    },
    totalEmailsSent: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

resendIntegrationSchema.methods.getMaskedApiKey = function () {
  if (!this.apiKey) return 'Not Configured';
  if (this.apiKey.length <= 8) return 're_••••';
  return `${this.apiKey.slice(0, 5)}...${this.apiKey.slice(-4)}`;
};

const ResendIntegration = mongoose.model('ResendIntegration', resendIntegrationSchema);

module.exports = ResendIntegration;
