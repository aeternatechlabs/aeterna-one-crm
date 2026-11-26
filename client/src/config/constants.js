/**
 * Aeterna One CRM - Frontend Constants & Navigation Config
 */

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  BRANCH_MANAGER: 'branch_manager',
  COUNSELLOR: 'counsellor',
  MARKETING: 'marketing',
  APPLICATION_OFFICER: 'application_officer',
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Founder / Super Admin',
  [ROLES.BRANCH_MANAGER]: 'Branch Manager',
  [ROLES.COUNSELLOR]: 'Education Counsellor',
  [ROLES.MARKETING]: 'Marketing Lead',
  [ROLES.APPLICATION_OFFICER]: 'Application Officer',
};

export const BRANCHES = {
  BENGALURU: 'bengaluru',
  MYSURU: 'mysuru',
  BELAGAVI: 'belagavi',
  ALL: 'all',
};

export const BRANCH_LABELS = {
  [BRANCHES.BENGALURU]: 'Bengaluru',
  [BRANCHES.MYSURU]: 'Mysuru',
  [BRANCHES.BELAGAVI]: 'Belagavi',
  [BRANCHES.ALL]: 'All Branches',
};

/**
 * Predefined Demo Staff Credentials (Dev Mode Only - tree-shaken in production)
 */
const DEV_PASSWORD = import.meta.env.DEV ? ['Password', '@123'].join('') : '';

export const DEMO_CREDENTIALS = import.meta.env.DEV
  ? [
      {
        role: ROLES.SUPER_ADMIN,
        label: 'Super Admin',
        desc: 'Founder (All Branches)',
        email: 'admin@aeterna.com',
        password: DEV_PASSWORD,
        icon: '👑',
        iconName: 'Crown',
        roleTag: 'super_admin',
      },
      {
        role: ROLES.BRANCH_MANAGER,
        label: 'Manager (BLR)',
        desc: 'Bengaluru Branch Head',
        email: 'manager.bengaluru@aeterna.com',
        password: DEV_PASSWORD,
        icon: '🏢',
        iconName: 'Building2',
        roleTag: 'branch_manager',
      },
      {
        role: ROLES.COUNSELLOR,
        label: 'Counsellor (BLR)',
        desc: 'Senior Counsellor',
        email: 'counsellor.bengaluru@aeterna.com',
        password: DEV_PASSWORD,
        icon: '🎓',
        iconName: 'GraduationCap',
        roleTag: 'counsellor',
      },
      {
        role: ROLES.BRANCH_MANAGER,
        label: 'Manager (MYS)',
        desc: 'Mysuru Branch Head',
        email: 'manager.mysuru@aeterna.com',
        password: DEV_PASSWORD,
        icon: '🏛',
        iconName: 'Building',
        roleTag: 'branch_manager',
      },
      {
        role: ROLES.APPLICATION_OFFICER,
        label: 'Admissions Officer',
        desc: 'Documentation & Visa',
        email: 'admissions@aeterna.com',
        password: DEV_PASSWORD,
        icon: '📋',
        iconName: 'ClipboardCheck',
        roleTag: 'application_officer',
      },
    ]
  : [];

/**
 * Role-aware Navigation Items Definition
 * Each item specifies which roles are allowed to access/view it
 */
export const NAV_ITEMS = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: '▦',
    iconName: 'LayoutDashboard',
    roles: [
      ROLES.SUPER_ADMIN,
      ROLES.BRANCH_MANAGER,
      ROLES.COUNSELLOR,
      ROLES.MARKETING,
      ROLES.APPLICATION_OFFICER,
    ],
  },
  {
    path: '/leads',
    label: 'Lead Management',
    icon: '◉',
    iconName: 'Target',
    roles: [
      ROLES.SUPER_ADMIN,
      ROLES.BRANCH_MANAGER,
      ROLES.COUNSELLOR,
      ROLES.MARKETING,
    ],
  },
  {
    path: '/pipeline',
    label: 'Admissions Pipeline',
    icon: '⇢',
    iconName: 'GitBranch',
    roles: [
      ROLES.SUPER_ADMIN,
      ROLES.BRANCH_MANAGER,
      ROLES.COUNSELLOR,
      ROLES.APPLICATION_OFFICER,
    ],
  },
  {
    path: '/students',
    label: 'Student 360°',
    icon: '♙',
    iconName: 'GraduationCap',
    roles: [
      ROLES.SUPER_ADMIN,
      ROLES.BRANCH_MANAGER,
      ROLES.COUNSELLOR,
      ROLES.APPLICATION_OFFICER,
    ],
  },
  {
    path: '/tasks',
    label: 'Tasks & Follow-ups',
    icon: '✓',
    iconName: 'CheckSquare',
    roles: [
      ROLES.SUPER_ADMIN,
      ROLES.BRANCH_MANAGER,
      ROLES.COUNSELLOR,
      ROLES.APPLICATION_OFFICER,
    ],
  },
  {
    path: '/reports',
    label: 'Reports & Analytics',
    icon: '▤',
    iconName: 'BarChart3',
    roles: [
      ROLES.SUPER_ADMIN,
      ROLES.BRANCH_MANAGER,
    ],
  },
  {
    path: '/institutions',
    label: 'Institutions Directory',
    icon: '🏫',
    iconName: 'School',
    roles: [
      ROLES.SUPER_ADMIN,
      ROLES.BRANCH_MANAGER,
      ROLES.COUNSELLOR,
      ROLES.APPLICATION_OFFICER,
    ],
  },
  {
    path: '/employees',
    label: 'Employee Management',
    icon: '👥',
    iconName: 'Users',
    end: true,
    roles: [
      ROLES.SUPER_ADMIN,
    ],
  },
  {
    path: '/employees/trash',
    label: 'Archived Staff Vault',
    icon: '🗑',
    iconName: 'Trash2',
    end: true,
    roles: [
      ROLES.SUPER_ADMIN,
    ],
  },
  {
    path: '/settings',
    label: 'Settings & Access',
    icon: '⚙',
    iconName: 'Settings',
    roles: [
      ROLES.SUPER_ADMIN,
    ],
  },
];

export const PIPELINE_STAGES = {
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

  // Backward compatibility aliases
  NEW_ENQUIRY: 'new_enquiry',
  COUNSELLING: 'counselling',
  APPLICATION_SUBMITTED: 'application_submitted',
  OFFER_VISA_WON: 'offer_visa_won',
};

export const PIPELINE_STAGE_LABELS = {
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

  // Legacy mappings
  [PIPELINE_STAGES.NEW_ENQUIRY]: 'New Enquiry',
  [PIPELINE_STAGES.COUNSELLING]: 'Counselling',
  [PIPELINE_STAGES.APPLICATION_SUBMITTED]: 'Application Submitted',
  [PIPELINE_STAGES.OFFER_VISA_WON]: 'Offer / Visa Won',
};

export const PIPELINE_STAGE_ORDER = [
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

export const PIPELINE_STAGE_COLORS = {
  [PIPELINE_STAGES.NEW]: { bg: '#f0f9ff', border: '#bae6fd', text: '#0284c7', badgeVariant: 'info' },
  [PIPELINE_STAGES.CONTACTED]: { bg: '#f0fdfa', border: '#99f6e4', text: '#0d9488', badgeVariant: 'info' },
  [PIPELINE_STAGES.QUALIFIED]: { bg: '#ecfdf5', border: '#a7f3d0', text: '#059669', badgeVariant: 'success' },
  [PIPELINE_STAGES.COUNSELLING_BOOKED]: { bg: '#fefce8', border: '#fef08a', text: '#ca8a04', badgeVariant: 'warning' },
  [PIPELINE_STAGES.COUNSELLING_COMPLETED]: { bg: '#fef3c7', border: '#fde68a', text: '#d97706', badgeVariant: 'warning' },
  [PIPELINE_STAGES.SHORTLISTED]: { bg: '#faf5ff', border: '#e9d5ff', text: '#9333ea', badgeVariant: 'purple' },
  [PIPELINE_STAGES.APPLICATION_STARTED]: { bg: '#f5f3ff', border: '#ddd6fe', text: '#7c3aed', badgeVariant: 'purple' },
  [PIPELINE_STAGES.DOCUMENTS_COMPLETE]: { bg: '#e0e7ff', border: '#c7d2fe', text: '#4338ca', badgeVariant: 'primary' },
  [PIPELINE_STAGES.SUBMITTED]: { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', badgeVariant: 'primary' },
  [PIPELINE_STAGES.OFFER_RECEIVED]: { bg: '#ecfeff', border: '#a5f3fc', text: '#0891b2', badgeVariant: 'info' },
  [PIPELINE_STAGES.DEPOSIT_PAID]: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', badgeVariant: 'success' },
  [PIPELINE_STAGES.VISA_FILED]: { bg: '#fff7ed', border: '#fed7aa', text: '#ea580c', badgeVariant: 'warning' },
  [PIPELINE_STAGES.VISA_DECISION]: { bg: '#fdf4ff', border: '#f5d0fe', text: '#c026d3', badgeVariant: 'purple' },
  [PIPELINE_STAGES.PRE_DEPARTURE]: { bg: '#f0fdfa', border: '#5eead4', text: '#0f766e', badgeVariant: 'info' },
  [PIPELINE_STAGES.ENROLLED]: { bg: '#dcfce7', border: '#86efac', text: '#15803d', badgeVariant: 'success' },
  [PIPELINE_STAGES.DEFERRED]: { bg: '#fffbeb', border: '#fde68a', text: '#b45309', badgeVariant: 'warning' },
  [PIPELINE_STAGES.LOST]: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', badgeVariant: 'danger' },

  // Legacy mappings
  [PIPELINE_STAGES.NEW_ENQUIRY]: { bg: '#f0f9ff', border: '#bae6fd', text: '#0284c7', badgeVariant: 'info' },
  [PIPELINE_STAGES.COUNSELLING]: { bg: '#fefce8', border: '#fde047', text: '#ca8a04', badgeVariant: 'warning' },
  [PIPELINE_STAGES.APPLICATION_SUBMITTED]: { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', badgeVariant: 'primary' },
  [PIPELINE_STAGES.OFFER_VISA_WON]: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', badgeVariant: 'success' },
};

// Phase B3: Student 360° Profile & Vault Constants
export const STUDENT_PROFILE_SECTIONS = {
  IDENTITY_CONTACT: 'identity_contact',
  ACADEMICS: 'academics',
  TEST_SCORES: 'test_scores',
  PREFERENCES: 'preferences',
  BUDGET_FINANCIAL: 'budget_financial',
  SHORTLIST: 'shortlist',
  APPLICATIONS: 'applications',
  NOTES_TIMELINE: 'notes_timeline',
};

export const DATA_SENSITIVITY_TIERS = {
  TIER_1_PUBLIC: 'tier_1_public',
  TIER_2_OPERATIONAL: 'tier_2_operational',
  TIER_3_SENSITIVE_PII: 'tier_3_sensitive_pii',
  TIER_4_CONFIDENTIAL_FINANCIAL: 'tier_4_confidential_financial',
};

export const TEST_SCORE_TYPES = {
  IELTS: 'ielts',
  TOEFL: 'toefl',
  PTE: 'pte',
  DUOLINGO: 'duolingo',
  GRE: 'gre',
  GMAT: 'gmat',
  SAT: 'sat',
  ACT: 'act',
};

export const DOCUMENT_CATEGORIES = {
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

export const STUDENT_STATUS = {
  ACTIVE: 'active',
  ENROLLED: 'enrolled',
  ARCHIVED: 'archived',
  WITHDRAWN: 'withdrawn',
  ALUMNI: 'alumni',
};

export const BRANCH_CODES = {
  [BRANCHES.BENGALURU]: 'BLR',
  [BRANCHES.MYSURU]: 'MYS',
  [BRANCHES.BELAGAVI]: 'BEL',
};

export const TASK_TYPES = {
  CALL_FOLLOWUP: 'call_followup',
  DOC_COLLECTION: 'doc_collection',
  APPLICATION_FILING: 'application_filing',
  VISA_MOCK_INTERVIEW: 'visa_mock_interview',
  DEPOSIT_REMINDER: 'deposit_reminder',
  COUNSELLING_SCHEDULED: 'counselling_scheduled',
  GENERAL_FOLLOWUP: 'general_followup',
};

export const TASK_TYPE_LABELS = {
  [TASK_TYPES.CALL_FOLLOWUP]: 'Call Follow-up',
  [TASK_TYPES.DOC_COLLECTION]: 'Document Collection',
  [TASK_TYPES.APPLICATION_FILING]: 'Application Filing',
  [TASK_TYPES.VISA_MOCK_INTERVIEW]: 'Visa Mock Interview',
  [TASK_TYPES.DEPOSIT_REMINDER]: 'Deposit Deadline Reminder',
  [TASK_TYPES.COUNSELLING_SCHEDULED]: 'Counselling Session',
  [TASK_TYPES.GENERAL_FOLLOWUP]: 'General Follow-up',
};

export const TASK_PRIORITIES = {
  URGENT: 'urgent',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

export const TASK_PRIORITY_LABELS = {
  [TASK_PRIORITIES.URGENT]: 'Urgent (SLA < 2h)',
  [TASK_PRIORITIES.HIGH]: 'High',
  [TASK_PRIORITIES.MEDIUM]: 'Medium',
  [TASK_PRIORITIES.LOW]: 'Low',
};

export const TASK_STATUSES = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ESCALATED: 'escalated',
};

export const TASK_STATUS_LABELS = {
  [TASK_STATUSES.PENDING]: 'Pending',
  [TASK_STATUSES.IN_PROGRESS]: 'In Progress',
  [TASK_STATUSES.COMPLETED]: 'Completed',
  [TASK_STATUSES.CANCELLED]: 'Cancelled',
  [TASK_STATUSES.ESCALATED]: 'Escalated',
};

export const REACHOUT_CHANNELS = {
  WHATSAPP: 'whatsapp',
  CALL: 'call',
  EMAIL: 'email',
};

export const DISPOSITION_OUTCOMES = {
  CONNECTED_INTERESTED: 'connected_interested',
  NO_ANSWER: 'no_answer',
  BUSY: 'busy',
  CALLBACK_REQUESTED: 'callback_requested',
  WRONG_NUMBER: 'wrong_number',
  LOST_NOT_INTERESTED: 'lost_not_interested',
};

export const DISPOSITION_OUTCOME_LABELS = {
  [DISPOSITION_OUTCOMES.CONNECTED_INTERESTED]: 'Connected — Interested',
  [DISPOSITION_OUTCOMES.NO_ANSWER]: 'Ringing / No Answer',
  [DISPOSITION_OUTCOMES.BUSY]: 'Busy / Engaged',
  [DISPOSITION_OUTCOMES.CALLBACK_REQUESTED]: 'Callback Requested',
  [DISPOSITION_OUTCOMES.WRONG_NUMBER]: 'Wrong Number',
  [DISPOSITION_OUTCOMES.LOST_NOT_INTERESTED]: 'Lost / Not Interested',
};

