/**
 * Aeterna One CRM - Core System Constants
 */

const ROLES = {
  SUPER_ADMIN: 'super_admin',
  BRANCH_MANAGER: 'branch_manager',
  COUNSELLOR: 'counsellor',
  MARKETING: 'marketing',
  APPLICATION_OFFICER: 'application_officer',
};

const BRANCHES = {
  BENGALURU: 'bengaluru',
  MYSURU: 'mysuru',
  BELAGAVI: 'belagavi',
  ALL: 'all', // Cross-branch access for super admins
};

const PIPELINE_STAGES = {
  NEW_ENQUIRY: 'new_enquiry',
  COUNSELLING: 'counselling',
  SHORTLISTED: 'shortlisted',
  APPLICATION_SUBMITTED: 'application_submitted',
  OFFER_VISA_WON: 'offer_visa_won',
  LOST: 'lost',
};

const PIPELINE_STAGE_LABELS = {
  [PIPELINE_STAGES.NEW_ENQUIRY]: 'New Enquiry',
  [PIPELINE_STAGES.COUNSELLING]: 'Counselling',
  [PIPELINE_STAGES.SHORTLISTED]: 'Shortlisted',
  [PIPELINE_STAGES.APPLICATION_SUBMITTED]: 'Application Submitted',
  [PIPELINE_STAGES.OFFER_VISA_WON]: 'Offer / Visa Won',
  [PIPELINE_STAGES.LOST]: 'Lost / Deferred',
};

const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,
};

const JWT = {
  ACCESS_EXPIRES_IN: '1d',
  REFRESH_EXPIRES_IN: '7d',
};

const STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER: 500,
};

module.exports = {
  ROLES,
  BRANCHES,
  PIPELINE_STAGES,
  PIPELINE_STAGE_LABELS,
  RATE_LIMIT,
  JWT,
  STATUS,
};
