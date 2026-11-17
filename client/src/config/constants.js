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
    plannedPhase: 'Phase 2',
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
    plannedPhase: 'Phase 3',
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
    ],
    plannedPhase: 'Phase 3',
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
    plannedPhase: 'Phase 4',
  },
  {
    path: '/settings',
    label: 'Settings & Access',
    icon: '⚙',
    iconName: 'Settings',
    roles: [
      ROLES.SUPER_ADMIN,
    ],
    plannedPhase: 'Phase 1',
  },
];

export const PIPELINE_STAGES = {
  NEW_ENQUIRY: 'new_enquiry',
  COUNSELLING: 'counselling',
  SHORTLISTED: 'shortlisted',
  APPLICATION_SUBMITTED: 'application_submitted',
  OFFER_VISA_WON: 'offer_visa_won',
  LOST: 'lost',
};

export const PIPELINE_STAGE_LABELS = {
  [PIPELINE_STAGES.NEW_ENQUIRY]: 'New Enquiry',
  [PIPELINE_STAGES.COUNSELLING]: 'Counselling',
  [PIPELINE_STAGES.SHORTLISTED]: 'Shortlisted',
  [PIPELINE_STAGES.APPLICATION_SUBMITTED]: 'Application Submitted',
  [PIPELINE_STAGES.OFFER_VISA_WON]: 'Offer / Visa Won',
  [PIPELINE_STAGES.LOST]: 'Lost / Deferred',
};

export const PIPELINE_STAGE_ORDER = [
  PIPELINE_STAGES.NEW_ENQUIRY,
  PIPELINE_STAGES.COUNSELLING,
  PIPELINE_STAGES.SHORTLISTED,
  PIPELINE_STAGES.APPLICATION_SUBMITTED,
  PIPELINE_STAGES.OFFER_VISA_WON,
  PIPELINE_STAGES.LOST,
];

export const PIPELINE_STAGE_COLORS = {
  [PIPELINE_STAGES.NEW_ENQUIRY]: {
    bg: '#f0f9ff',
    border: '#bae6fd',
    text: '#0284c7',
    badgeVariant: 'info',
  },
  [PIPELINE_STAGES.COUNSELLING]: {
    bg: '#fefce8',
    border: '#fde047',
    text: '#ca8a04',
    badgeVariant: 'warning',
  },
  [PIPELINE_STAGES.SHORTLISTED]: {
    bg: '#faf5ff',
    border: '#d8b4fe',
    text: '#9333ea',
    badgeVariant: 'purple',
  },
  [PIPELINE_STAGES.APPLICATION_SUBMITTED]: {
    bg: '#eff6ff',
    border: '#bfdbfe',
    text: '#2563eb',
    badgeVariant: 'primary',
  },
  [PIPELINE_STAGES.OFFER_VISA_WON]: {
    bg: '#f0fdf4',
    border: '#bbf7d0',
    text: '#16a34a',
    badgeVariant: 'success',
  },
  [PIPELINE_STAGES.LOST]: {
    bg: '#fef2f2',
    border: '#fecaca',
    text: '#dc2626',
    badgeVariant: 'danger',
  },
};

