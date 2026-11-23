const TEMPLATE_CATALOG = {
  welcome_discovery: {
    id: 'welcome_discovery',
    name: 'Welcome & Initial Discovery Consultation',
    stageGroup: 'stages_1_3',
    channels: ['whatsapp', 'email'],
    subject: 'Welcome to Aeterna Overseas Education — Let’s Map Your Global Degree',
    templateText:
      'Hello {{candidate_name}}, welcome to Aeterna Overseas Education! I am {{counsellor_name}} from our {{branch_name}} hub. We received your interest in studying in {{target_country}} for the {{intake_term}} intake. Can we schedule a brief 10-minute discovery call today to shortlist top accredited universities?',
  },
  counselling_invite: {
    id: 'counselling_invite',
    name: 'Counselling Session Booking Confirmation',
    stageGroup: 'stages_4_5',
    channels: ['whatsapp', 'email'],
    subject: 'Confirmed: Your 1-on-1 Overseas Education Counselling Session',
    templateText:
      'Dear {{candidate_name}}, your personalized counselling session with {{counsellor_name}} is confirmed. We will review admission requirements for {{target_programme}} at {{target_university}}. For assistance, reach our {{branch_name}} office at {{branch_phone}}.',
  },
  document_checklist_nudge: {
    id: 'document_checklist_nudge',
    name: 'Document Checklist & Application Filing Nudge',
    stageGroup: 'stages_6_8',
    channels: ['whatsapp', 'email'],
    subject: 'Action Required: Pending Documents for {{target_university}} Application',
    templateText:
      'Hi {{candidate_name}}, our Admissions Desk is assembling your application for {{target_programme}} at {{target_university}}. Please upload your pending documents to your Student Vault today to secure priority intake deadlines.',
  },
  offer_celebration_deposit: {
    id: 'offer_celebration_deposit',
    name: 'University Offer Celebration & Deposit Alert',
    stageGroup: 'stages_9_10',
    channels: ['whatsapp', 'email'],
    subject: 'Congratulations! Official Offer Received from {{target_university}}',
    templateText:
      'Hearty congratulations {{candidate_name}}! {{target_university}} has issued an official offer for {{target_programme}}. To accept your seat and issue your CAS/I-20, the tuition deposit must be completed before the university deadline.',
  },
  visa_mock_prep: {
    id: 'visa_mock_prep',
    name: 'Visa Filing Checklist & Mock Interview Schedule',
    stageGroup: 'stages_11_13',
    channels: ['whatsapp', 'email'],
    subject: 'Visa Preparation: Embassy Mock Interview with Aeterna Experts',
    templateText:
      'Dear {{candidate_name}}, your student visa filing for {{target_country}} is underway. We have scheduled your 1-on-1 Visa Mock Interview with our Senior Visa Officer to review financial solvency and visa Q&A.',
  },
  predeparture_briefing: {
    id: 'predeparture_briefing',
    name: 'Pre-Departure Briefing & Student Arrival Guide',
    stageGroup: 'stages_14_15',
    channels: ['whatsapp', 'email'],
    subject: 'Ready to Fly! Pre-Departure Briefing & Arrival Checklist',
    templateText:
      'Dear {{candidate_name}}, congratulations on securing your student visa for {{target_country}}! Join our upcoming Pre-Departure Orientation for packing lists, forex card setup, and student accommodation guidance.',
  },
};

const sanitizeHtml = (str) => {
  if (typeof str !== 'string') return String(str || '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const renderTemplate = (templateString, variables = {}) => {
  if (typeof templateString !== 'string') return '';

  return templateString.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, token) => {
    if (Object.prototype.hasOwnProperty.call(variables, token)) {
      const val = variables[token];
      return val !== null && val !== undefined ? sanitizeHtml(val) : '';
    }
    return '';
  });
};

const getTemplatesByChannel = (channel) => {
  return Object.values(TEMPLATE_CATALOG).filter((t) => t.channels.includes(channel));
};

module.exports = {
  TEMPLATE_CATALOG,
  renderTemplate,
  getTemplatesByChannel,
  sanitizeHtml,
};
