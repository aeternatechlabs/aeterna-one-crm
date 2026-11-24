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
  NEW: 'new',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  COUNSELLING_BOOKED: 'counselling_booked',
  COUNSELLING_COMPLETED: 'counselling_completed',
  SHORTLISTED: 'shortlisted',
  APPLICATION_STARTED: 'application_started',
  DOCUMENTS_COMPLETE: 'documents_complete',
  SUBMITTED: 'submitted',
  OFFER_RECEIVED: 'offer_received',
  DEPOSIT_PAID: 'deposit_paid',
  VISA_FILED: 'visa_filed',
  VISA_DECISION: 'visa_decision',
  PRE_DEPARTURE: 'pre_departure',
  ENROLLED: 'enrolled',
  DEFERRED: 'deferred',
  LOST: 'lost',

  // Backward compatibility aliases for existing tests & legacy records
  NEW_ENQUIRY: 'new_enquiry',
  COUNSELLING: 'counselling',
  APPLICATION_SUBMITTED: 'application_submitted',
  OFFER_VISA_WON: 'offer_visa_won',
};

const PIPELINE_STAGE_LABELS = {
  [PIPELINE_STAGES.NEW]: 'New',
  [PIPELINE_STAGES.CONTACTED]: 'Contacted',
  [PIPELINE_STAGES.QUALIFIED]: 'Qualified',
  [PIPELINE_STAGES.COUNSELLING_BOOKED]: 'Counselling Booked',
  [PIPELINE_STAGES.COUNSELLING_COMPLETED]: 'Counselling Completed',
  [PIPELINE_STAGES.SHORTLISTED]: 'Shortlisted',
  [PIPELINE_STAGES.APPLICATION_STARTED]: 'Application Started',
  [PIPELINE_STAGES.DOCUMENTS_COMPLETE]: 'Documents Complete',
  [PIPELINE_STAGES.SUBMITTED]: 'Submitted',
  [PIPELINE_STAGES.OFFER_RECEIVED]: 'Offer Received',
  [PIPELINE_STAGES.DEPOSIT_PAID]: 'Deposit Paid',
  [PIPELINE_STAGES.VISA_FILED]: 'Visa Filed',
  [PIPELINE_STAGES.VISA_DECISION]: 'Visa Decision',
  [PIPELINE_STAGES.PRE_DEPARTURE]: 'Pre-departure',
  [PIPELINE_STAGES.ENROLLED]: 'Enrolled',
  [PIPELINE_STAGES.DEFERRED]: 'Deferred',
  [PIPELINE_STAGES.LOST]: 'Lost',

  // Legacy labels
  [PIPELINE_STAGES.NEW_ENQUIRY]: 'New Enquiry',
  [PIPELINE_STAGES.COUNSELLING]: 'Counselling',
  [PIPELINE_STAGES.APPLICATION_SUBMITTED]: 'Application Submitted',
  [PIPELINE_STAGES.OFFER_VISA_WON]: 'Offer / Visa Won',
};

const PIPELINE_STAGE_ORDER = [
  PIPELINE_STAGES.NEW,
  PIPELINE_STAGES.CONTACTED,
  PIPELINE_STAGES.QUALIFIED,
  PIPELINE_STAGES.COUNSELLING_BOOKED,
  PIPELINE_STAGES.COUNSELLING_COMPLETED,
  PIPELINE_STAGES.SHORTLISTED,
  PIPELINE_STAGES.APPLICATION_STARTED,
  PIPELINE_STAGES.DOCUMENTS_COMPLETE,
  PIPELINE_STAGES.SUBMITTED,
  PIPELINE_STAGES.OFFER_RECEIVED,
  PIPELINE_STAGES.DEPOSIT_PAID,
  PIPELINE_STAGES.VISA_FILED,
  PIPELINE_STAGES.VISA_DECISION,
  PIPELINE_STAGES.PRE_DEPARTURE,
  PIPELINE_STAGES.ENROLLED,
  PIPELINE_STAGES.DEFERRED,
  PIPELINE_STAGES.LOST,
];

const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,
};

const JWT = {
  ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  ABSOLUTE_SESSION_EXPIRES_IN_DAYS: 30,
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

// Phase B3: Student 360° Profile & Vault Constants
const STUDENT_PROFILE_SECTIONS = {
  IDENTITY_CONTACT: 'identity_contact',
  ACADEMICS: 'academics',
  TEST_SCORES: 'test_scores',
  PREFERENCES: 'preferences',
  BUDGET_FINANCIAL: 'budget_financial',
  SHORTLIST: 'shortlist',
  APPLICATIONS: 'applications',
  NOTES_TIMELINE: 'notes_timeline',
};

const DATA_SENSITIVITY_TIERS = {
  TIER_1_PUBLIC: 'tier_1_public',
  TIER_2_OPERATIONAL: 'tier_2_operational',
  TIER_3_SENSITIVE_PII: 'tier_3_sensitive_pii',
  TIER_4_CONFIDENTIAL_FINANCIAL: 'tier_4_confidential_financial',
};

const TEST_SCORE_TYPES = {
  IELTS: 'ielts',
  TOEFL: 'toefl',
  PTE: 'pte',
  DUOLINGO: 'duolingo',
  GRE: 'gre',
  GMAT: 'gmat',
  SAT: 'sat',
  ACT: 'act',
};

const DOCUMENT_CATEGORIES = {
  PASSPORT: 'passport',
  ACADEMIC_TRANSCRIPT: 'academic_transcript',
  DEGREE_CERTIFICATE: 'degree_certificate',
  ENGLISH_TEST_SCORECARD: 'english_test_scorecard',
  SOP: 'sop',
  LOR: 'lor',
  RESUME_CV: 'resume_cv',
  FINANCIAL_STATEMENT: 'financial_statement',
  OFFER_LETTER: 'offer_letter',
  VISA_APPLICATION: 'visa_application',
  OTHER: 'other',
};

const STUDENT_STATUS = {
  ACTIVE: 'active',
  ENROLLED: 'enrolled',
  ARCHIVED: 'archived',
  WITHDRAWN: 'withdrawn',
  ALUMNI: 'alumni',
};

const BRANCH_CODES = {
  [BRANCHES.BENGALURU]: 'BLR',
  [BRANCHES.MYSURU]: 'MYS',
  [BRANCHES.BELAGAVI]: 'BEL',
};

const TASK_TYPES = {
  CALL_FOLLOWUP: 'call_followup',
  DOC_COLLECTION: 'doc_collection',
  APPLICATION_FILING: 'application_filing',
  VISA_MOCK_INTERVIEW: 'visa_mock_interview',
  DEPOSIT_REMINDER: 'deposit_reminder',
  COUNSELLING_SCHEDULED: 'counselling_scheduled',
  GENERAL_FOLLOWUP: 'general_followup',
};

const TASK_TYPE_LABELS = {
  [TASK_TYPES.CALL_FOLLOWUP]: 'Call Follow-up',
  [TASK_TYPES.DOC_COLLECTION]: 'Document Collection',
  [TASK_TYPES.APPLICATION_FILING]: 'Application Filing',
  [TASK_TYPES.VISA_MOCK_INTERVIEW]: 'Visa Mock Interview',
  [TASK_TYPES.DEPOSIT_REMINDER]: 'Deposit Deadline Reminder',
  [TASK_TYPES.COUNSELLING_SCHEDULED]: 'Counselling Session',
  [TASK_TYPES.GENERAL_FOLLOWUP]: 'General Follow-up',
};

const TASK_PRIORITIES = {
  URGENT: 'urgent',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

const TASK_PRIORITY_LABELS = {
  [TASK_PRIORITIES.URGENT]: 'Urgent (SLA < 2h)',
  [TASK_PRIORITIES.HIGH]: 'High',
  [TASK_PRIORITIES.MEDIUM]: 'Medium',
  [TASK_PRIORITIES.LOW]: 'Low',
};

const TASK_STATUSES = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ESCALATED: 'escalated',
};

const TASK_STATUS_LABELS = {
  [TASK_STATUSES.PENDING]: 'Pending',
  [TASK_STATUSES.IN_PROGRESS]: 'In Progress',
  [TASK_STATUSES.COMPLETED]: 'Completed',
  [TASK_STATUSES.CANCELLED]: 'Cancelled',
  [TASK_STATUSES.ESCALATED]: 'Escalated',
};

const REACHOUT_CHANNELS = {
  WHATSAPP: 'whatsapp',
  CALL: 'call',
  EMAIL: 'email',
};

const DISPOSITION_OUTCOMES = {
  CONNECTED_INTERESTED: 'connected_interested',
  NO_ANSWER: 'no_answer',
  BUSY: 'busy',
  CALLBACK_REQUESTED: 'callback_requested',
  WRONG_NUMBER: 'wrong_number',
  LOST_NOT_INTERESTED: 'lost_not_interested',
};

const DISPOSITION_OUTCOME_LABELS = {
  [DISPOSITION_OUTCOMES.CONNECTED_INTERESTED]: 'Connected — Interested',
  [DISPOSITION_OUTCOMES.NO_ANSWER]: 'Ringing / No Answer',
  [DISPOSITION_OUTCOMES.BUSY]: 'Busy / Engaged',
  [DISPOSITION_OUTCOMES.CALLBACK_REQUESTED]: 'Callback Requested',
  [DISPOSITION_OUTCOMES.WRONG_NUMBER]: 'Wrong Number',
  [DISPOSITION_OUTCOMES.LOST_NOT_INTERESTED]: 'Lost / Not Interested',
};

module.exports = {
  ROLES,
  BRANCHES,
  BRANCH_CODES,
  PIPELINE_STAGES,
  PIPELINE_STAGE_LABELS,
  RATE_LIMIT,
  JWT,
  STATUS,
  STUDENT_PROFILE_SECTIONS,
  DATA_SENSITIVITY_TIERS,
  TEST_SCORE_TYPES,
  DOCUMENT_CATEGORIES,
  STUDENT_STATUS,
  TASK_TYPES,
  TASK_TYPE_LABELS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  REACHOUT_CHANNELS,
  DISPOSITION_OUTCOMES,
  DISPOSITION_OUTCOME_LABELS,
};
