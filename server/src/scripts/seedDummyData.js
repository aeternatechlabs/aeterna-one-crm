require('dotenv').config();
const mongoose = require('mongoose');
const PipelineStudent = require('../modules/pipeline/pipeline.model');
const Student = require('../modules/students/student.model');
const Document = require('../modules/vault/document.model');
const User = require('../modules/users/user.model');
const Employee = require('../modules/employees/employee.model');
const { Lead } = require('../modules/leads/lead.model');
const {
  ROLES,
  BRANCHES,
  PIPELINE_STAGES,
  STUDENT_STATUS,
  TEST_SCORE_TYPES,
} = require('../config/constants');

// Demo Staff Accounts across physical branches
const DEMO_STAFF = [
  {
    name: 'Sachin Tiwari (Super Admin)',
    email: 'admin@aeterna.com',
    password: 'Password@123',
    role: ROLES.SUPER_ADMIN,
    branch: BRANCHES.ALL,
    phone: '+91 99000 11223',
    isActive: true,
  },
  {
    name: 'Rajesh Varma (Bengaluru Manager)',
    email: 'manager.bengaluru@aeterna.com',
    password: 'Password@123',
    role: ROLES.BRANCH_MANAGER,
    branch: BRANCHES.BENGALURU,
    phone: '+91 98450 33445',
    isActive: true,
  },
  {
    name: 'Priya Nair (Bengaluru Counsellor)',
    email: 'counsellor.bengaluru@aeterna.com',
    password: 'Password@123',
    role: ROLES.COUNSELLOR,
    branch: BRANCHES.BENGALURU,
    phone: '+91 98860 55667',
    isActive: true,
  },
  {
    name: 'Ananya Rao (Application Officer)',
    email: 'admissions@aeterna.com',
    password: 'Password@123',
    role: ROLES.APPLICATION_OFFICER,
    branch: BRANCHES.BENGALURU,
    phone: '+91 97400 99001',
    isActive: true,
  },
  {
    name: 'Vikram Joshi (Mysuru Manager)',
    email: 'manager.mysuru@aeterna.com',
    password: 'Password@123',
    role: ROLES.BRANCH_MANAGER,
    branch: BRANCHES.MYSURU,
    phone: '+91 98220 77889',
    isActive: true,
  },
  {
    name: 'Suresh Bhat (Mysuru Counsellor)',
    email: 'counsellor.mysuru@aeterna.com',
    password: 'Password@123',
    role: ROLES.COUNSELLOR,
    branch: BRANCHES.MYSURU,
    phone: '+91 98440 22334',
    isActive: true,
  },
  {
    name: 'Mahesh Kulkarni (Belagavi Manager)',
    email: 'manager.belagavi@aeterna.com',
    password: 'Password@123',
    role: ROLES.BRANCH_MANAGER,
    branch: BRANCHES.BELAGAVI,
    phone: '+91 98810 66778',
    isActive: true,
  },
  {
    name: 'Deepak Patil (Belagavi Counsellor)',
    email: 'counsellor.belagavi@aeterna.com',
    password: 'Password@123',
    role: ROLES.COUNSELLOR,
    branch: BRANCHES.BELAGAVI,
    phone: '+91 98500 88990',
    isActive: true,
  },
];

// ==========================================
// DUMMY STAFF EMPLOYEES (Directory & Vault)
// ==========================================
const DUMMY_EMPLOYEES_DATA = [
  // --- BENGALURU (HQ) ---
  {
    first_name: 'Rajesh',
    last_name: 'Varma',
    employee_code: 'AET-101',
    email: 'manager.bengaluru@aeterna.com',
    branch: BRANCHES.BENGALURU,
    role: ROLES.BRANCH_MANAGER,
    department: 'Branch Management',
    designation: 'Branch Manager',
    employment_status: 'Active',
    profile_photo: '/staff/avatar-manager-m1.jpg',
    contact_info: {
      phone: '+91 98450 33445',
      address: '#14, 12th Main, Indiranagar, Bengaluru - 560038',
      emergency_contact_name: 'Lakshmi Varma (Spouse)',
      emergency_contact_phone: '+91 98450 99881',
    },
    deletionStage: 'ACTIVE',
  },
  {
    first_name: 'Priya',
    last_name: 'Nair',
    employee_code: 'AET-102',
    email: 'counsellor.bengaluru@aeterna.com',
    branch: BRANCHES.BENGALURU,
    role: ROLES.COUNSELLOR,
    department: 'Counselling & Admissions',
    designation: 'Senior Education Counsellor',
    employment_status: 'Active',
    profile_photo: '/staff/avatar-counsellor-f1.jpg',
    contact_info: {
      phone: '+91 98860 55667',
      address: '#45, 80ft Road, Koramangala 4th Block, Bengaluru - 560034',
      emergency_contact_name: 'Gopal Nair (Father)',
      emergency_contact_phone: '+91 98860 11229',
    },
    deletionStage: 'ACTIVE',
  },
  {
    first_name: 'Ananya',
    last_name: 'Rao',
    employee_code: 'AET-103',
    email: 'admissions@aeterna.com',
    branch: BRANCHES.BENGALURU,
    role: ROLES.APPLICATION_OFFICER,
    department: 'Application & Visa Processing',
    designation: 'Admissions Officer',
    employment_status: 'Active',
    profile_photo: '/staff/avatar-admissions-f2.jpg',
    contact_info: {
      phone: '+91 97400 99001',
      address: '#22, 5th Cross, Malleshwaram, Bengaluru - 560003',
      emergency_contact_name: 'Suma Rao (Mother)',
      emergency_contact_phone: '+91 97400 33441',
    },
    deletionStage: 'ACTIVE',
  },
  {
    first_name: 'Kavya',
    last_name: 'Hegde',
    employee_code: 'AET-104',
    email: 'kavya.hegde@aeterna.com',
    branch: BRANCHES.BENGALURU,
    role: ROLES.MARKETING,
    department: 'Marketing & Lead Generation',
    designation: 'Marketing Lead',
    employment_status: 'Active',
    profile_photo: '/staff/avatar-visa-m2.jpg',
    contact_info: {
      phone: '+91 98451 77665',
      address: '#108, HSR Layout Sector 1, Bengaluru - 560102',
      emergency_contact_name: 'Ashok Hegde (Father)',
      emergency_contact_phone: '+91 98451 00998',
    },
    deletionStage: 'ACTIVE',
  },
  {
    first_name: 'Rohan',
    last_name: 'Pai',
    employee_code: 'AET-105',
    email: 'rohan.pai@aeterna.com',
    branch: BRANCHES.BENGALURU,
    role: ROLES.COUNSELLOR,
    department: 'Student Operations',
    designation: 'Operations Executive',
    employment_status: 'Probation',
    profile_photo: '/staff/avatar-manager-m1.jpg',
    contact_info: {
      phone: '+91 98452 88990',
      address: '#33, JP Nagar 3rd Phase, Bengaluru - 560078',
      emergency_contact_name: 'Veena Pai (Mother)',
      emergency_contact_phone: '+91 98452 44332',
    },
    deletionStage: 'ACTIVE',
  },

  // --- MYSURU ---
  {
    first_name: 'Vikram',
    last_name: 'Joshi',
    employee_code: 'AET-201',
    email: 'manager.mysuru@aeterna.com',
    branch: BRANCHES.MYSURU,
    role: ROLES.BRANCH_MANAGER,
    department: 'Branch Management',
    designation: 'Branch Manager',
    employment_status: 'Active',
    profile_photo: '/staff/avatar-manager-m1.jpg',
    contact_info: {
      phone: '+91 98220 77889',
      address: '#19, Sayyaji Rao Road, Mandi Mohalla, Mysuru - 570021',
      emergency_contact_name: 'Anjali Joshi (Spouse)',
      emergency_contact_phone: '+91 98220 33441',
    },
    deletionStage: 'ACTIVE',
  },
  {
    first_name: 'Suresh',
    last_name: 'Bhat',
    employee_code: 'AET-202',
    email: 'counsellor.mysuru@aeterna.com',
    branch: BRANCHES.MYSURU,
    role: ROLES.COUNSELLOR,
    department: 'Counselling & Admissions',
    designation: 'Education Counsellor',
    employment_status: 'Active',
    profile_photo: '/staff/avatar-counsellor-f1.jpg',
    contact_info: {
      phone: '+91 98440 22334',
      address: '#88, Gokulam 3rd Stage, Mysuru - 570002',
      emergency_contact_name: 'Kavitha Bhat (Spouse)',
      emergency_contact_phone: '+91 98440 11998',
    },
    deletionStage: 'ACTIVE',
  },
  {
    first_name: 'Divya',
    last_name: 'Kulkarni',
    employee_code: 'AET-203',
    email: 'divya.kulkarni@aeterna.com',
    branch: BRANCHES.MYSURU,
    role: ROLES.COUNSELLOR,
    department: 'Counselling & Admissions',
    designation: 'Education Counsellor',
    employment_status: 'Active',
    profile_photo: '/staff/avatar-admissions-f2.jpg',
    contact_info: {
      phone: '+91 98441 55667',
      address: '#72, Kuvempunagar, Mysuru - 570023',
      emergency_contact_name: 'Shrikant Kulkarni (Father)',
      emergency_contact_phone: '+91 98441 88776',
    },
    deletionStage: 'ACTIVE',
  },

  // --- BELAGAVI ---
  {
    first_name: 'Mahesh',
    last_name: 'Kulkarni',
    employee_code: 'AET-301',
    email: 'manager.belagavi@aeterna.com',
    branch: BRANCHES.BELAGAVI,
    role: ROLES.BRANCH_MANAGER,
    department: 'Branch Management',
    designation: 'Branch Manager',
    employment_status: 'Active',
    profile_photo: '/staff/avatar-manager-m1.jpg',
    contact_info: {
      phone: '+91 98810 66778',
      address: '#56, College Road, Tilakwadi, Belagavi - 590006',
      emergency_contact_name: 'Pooja Kulkarni (Spouse)',
      emergency_contact_phone: '+91 98810 99887',
    },
    deletionStage: 'ACTIVE',
  },
  {
    first_name: 'Deepak',
    last_name: 'Patil',
    employee_code: 'AET-302',
    email: 'counsellor.belagavi@aeterna.com',
    branch: BRANCHES.BELAGAVI,
    role: ROLES.COUNSELLOR,
    department: 'Counselling & Admissions',
    designation: 'Senior Education Counsellor',
    employment_status: 'Active',
    profile_photo: '/staff/avatar-counsellor-f1.jpg',
    contact_info: {
      phone: '+91 98500 88990',
      address: '#12, Camp Area, Belagavi - 590001',
      emergency_contact_name: 'Sunil Patil (Brother)',
      emergency_contact_phone: '+91 98500 22331',
    },
    deletionStage: 'ACTIVE',
  },
  {
    first_name: 'Sunita',
    last_name: 'Deshmukh',
    employee_code: 'AET-303',
    email: 'sunita.deshmukh@aeterna.com',
    branch: BRANCHES.BELAGAVI,
    role: ROLES.MARKETING,
    department: 'Marketing & Lead Generation',
    designation: 'Telecaller & Lead Qualifier',
    employment_status: 'Active',
    profile_photo: '/staff/avatar-visa-m2.jpg',
    contact_info: {
      phone: '+91 98501 33445',
      address: '#90, Hindwadi, Belagavi - 590011',
      emergency_contact_name: 'Ajay Deshmukh (Spouse)',
      emergency_contact_phone: '+91 98501 77665',
    },
    deletionStage: 'ACTIVE',
  },

  // --- ARCHIVED / TRASH STAFF (Recovery Vault) ---
  {
    first_name: 'Harish',
    last_name: 'Shetty',
    employee_code: 'AET-901',
    email: 'harish.shetty@aeterna.com',
    branch: BRANCHES.BELAGAVI,
    role: ROLES.COUNSELLOR,
    department: 'Counselling & Admissions',
    designation: 'Education Counsellor',
    employment_status: 'Terminated',
    profile_photo: '/staff/avatar-manager-m1.jpg',
    contact_info: {
      phone: '+91 98509 99001',
      address: '#04, Shahapur, Belagavi - 590003',
      emergency_contact_name: 'Geetha Shetty (Spouse)',
      emergency_contact_phone: '+91 98509 44332',
    },
    deletionStage: 'TRASH',
    deleteReason: 'Resigned due to personal relocation to Pune',
    deletedAt: new Date(Date.now() - 6 * 86400000),
  },
  {
    first_name: 'Shilpa',
    last_name: 'Kamath',
    employee_code: 'AET-902',
    email: 'shilpa.kamath@aeterna.com',
    branch: BRANCHES.MYSURU,
    role: ROLES.MARKETING,
    department: 'Marketing & Lead Generation',
    designation: 'Marketing Lead',
    employment_status: 'Terminated',
    profile_photo: '/staff/avatar-visa-m2.jpg',
    contact_info: {
      phone: '+91 98449 88776',
      address: '#61, Saraswathipuram, Mysuru - 570009',
      emergency_contact_name: 'Ramesh Kamath (Father)',
      emergency_contact_phone: '+91 98449 11223',
    },
    deletionStage: 'TRASH',
    deleteReason: 'Fixed-term annual contract tenure concluded',
    deletedAt: new Date(Date.now() - 14 * 86400000),
  },
];

// ==========================================
// DUMMY LEAD INQUIRIES (Lead Management Hub)
// ==========================================
const DUMMY_LEADS_DATA = [
  // --- BENGALURU ---
  {
    name: 'Aditya Ramesh Rao',
    phone_number: '+91 98451 10001',
    email: 'aditya.rao@gmail.com',
    branch: BRANCHES.BENGALURU,
    destination_country: 'United Kingdom',
    study_level: "Master's",
    intake_target: 'Fall 2026',
    priority: 'high',
    current_status: 'New',
    source: 'website',
    notes: 'B.E. Computer Science from BMSCE (8.4 CGPA). Looking for MSc Data Science at Imperial College / UCL.',
  },
  {
    name: 'Meghana Sundaram',
    phone_number: '+91 98452 20002',
    email: 'meghana.s@yahoo.com',
    branch: BRANCHES.BENGALURU,
    destination_country: 'United States',
    study_level: "Master's",
    intake_target: 'Fall 2026',
    priority: 'high',
    current_status: 'Assigned',
    source: 'meta_ads',
    notes: 'GRE score 322 (Q168, V154). Interested in MS CS at UT Austin, Purdue, and Arizona State.',
  },
  {
    name: 'Nikhil Gowda',
    phone_number: '+91 98453 30003',
    email: 'nikhil.gowda@gmail.com',
    branch: BRANCHES.BENGALURU,
    destination_country: 'Germany',
    study_level: "Master's",
    intake_target: 'Winter 2026',
    priority: 'medium',
    current_status: 'Follow Up',
    follow_up_date: new Date(Date.now() + 86400000),
    follow_up_time: '11:30 AM',
    source: 'walk_in',
    notes: 'Mechanical engineer looking for English-taught automotive programs at TU Munich and RWTH Aachen.',
  },
  {
    name: 'Pooja Hegde',
    phone_number: '+91 98454 40004',
    email: 'pooja.hegde@hotmail.com',
    branch: BRANCHES.BENGALURU,
    destination_country: 'Ireland',
    study_level: "Master's",
    intake_target: 'Fall 2026',
    priority: 'medium',
    current_status: 'Interested',
    source: 'referral',
    notes: 'Finance graduate interested in MSc FinTech at Trinity College Dublin or UCD Michael Smurfit.',
  },
  {
    name: 'Kiran Kumar',
    phone_number: '+91 98455 50005',
    email: 'kiran.k99@gmail.com',
    branch: BRANCHES.BENGALURU,
    destination_country: 'Canada',
    study_level: 'Diploma',
    intake_target: 'January 2027',
    priority: 'low',
    current_status: 'Only WhatsApp',
    source: 'google_sheet',
    notes: 'Prefers chat communication only due to busy shift hours in IT company.',
  },
  {
    name: 'Tejaswini Shetty',
    phone_number: '+91 98456 60006',
    email: 'tejaswini.s@gmail.com',
    branch: BRANCHES.BENGALURU,
    destination_country: 'United Kingdom',
    study_level: "Master's",
    intake_target: 'Fall 2026',
    priority: 'high',
    current_status: 'Visited',
    source: 'walk_in',
    notes: 'In-person counseling session completed at Bengaluru Hub. Shortlisted Manchester and Bristol.',
  },
  {
    name: 'Manjunath Naik',
    phone_number: '+91 98457 70007',
    email: 'manjunath.naik@gmail.com',
    branch: BRANCHES.BENGALURU,
    destination_country: 'Australia',
    study_level: "Master's",
    intake_target: 'July 2026',
    priority: 'medium',
    current_status: 'New',
    source: 'website',
    notes: 'Fresh inquiry for Master of Information Technology at Monash or UNSW.',
  },

  // --- MYSURU ---
  {
    name: 'Darshan Wadeyar',
    phone_number: '+91 98220 11001',
    email: 'darshan.w@gmail.com',
    branch: BRANCHES.MYSURU,
    destination_country: 'United Kingdom',
    study_level: "Master's",
    intake_target: 'Fall 2026',
    priority: 'high',
    current_status: 'Deal Closed',
    source: 'walk_in',
    notes: 'Admissions consulting package finalized! Applications submitted to University of Edinburgh.',
  },
  {
    name: 'Shruthi Prasad',
    phone_number: '+91 98220 22002',
    email: 'shruthi.prasad@gmail.com',
    branch: BRANCHES.MYSURU,
    destination_country: 'Ireland',
    study_level: "Master's",
    intake_target: 'Fall 2026',
    priority: 'high',
    current_status: 'Assigned',
    source: 'website',
    notes: 'B.Pharm graduate from JSS Mysuru seeking MSc Pharmacology at NUI Galway.',
  },
  {
    name: 'Girish Urs',
    phone_number: '+91 98220 33003',
    email: 'girish.urs@yahoo.com',
    branch: BRANCHES.MYSURU,
    destination_country: 'United States',
    study_level: "Master's",
    intake_target: 'Fall 2026',
    priority: 'medium',
    current_status: 'Follow Up',
    follow_up_date: new Date(Date.now() - 86400000), // Overdue
    follow_up_time: '02:30 PM',
    source: 'referral',
    notes: 'Overdue follow up: Call student to discuss bank solvency certificate and I-20 financial requirements.',
  },
  {
    name: 'Aishwarya Deshpande',
    phone_number: '+91 98220 44004',
    email: 'aishwarya.d@gmail.com',
    branch: BRANCHES.MYSURU,
    destination_country: 'Canada',
    study_level: "Master's",
    intake_target: 'Fall 2026',
    priority: 'low',
    current_status: 'Not Interested',
    source: 'google_sheet',
    notes: 'Decided to continue current software engineering position at Infosys Mysuru for another year.',
  },
  {
    name: 'Vinayak Shastry',
    phone_number: '+91 98220 55005',
    email: 'vinayak.shastry@gmail.com',
    branch: BRANCHES.MYSURU,
    destination_country: 'Australia',
    study_level: 'MBA',
    intake_target: 'November 2026',
    priority: 'high',
    current_status: 'Confirm Visitor',
    source: 'walk_in',
    notes: 'Confirmed in-person appointment for profile evaluation this Saturday at Mysuru branch.',
  },

  // --- BELAGAVI ---
  {
    name: 'Sneha Belagavi',
    phone_number: '+91 98810 11001',
    email: 'sneha.b@gmail.com',
    branch: BRANCHES.BELAGAVI,
    destination_country: 'United Kingdom',
    study_level: 'MBA',
    intake_target: 'Fall 2026',
    priority: 'high',
    current_status: 'Visited',
    source: 'walk_in',
    notes: 'Visited Belagavi office with parents. Discussed 1-year MBA programs at Warwick and Cranfield.',
  },
  {
    name: 'Akash Patil',
    phone_number: '+91 98810 22002',
    email: 'akash.patil@outlook.com',
    branch: BRANCHES.BELAGAVI,
    destination_country: 'Australia',
    study_level: "Master's",
    intake_target: 'July 2026',
    priority: 'medium',
    current_status: 'Follow Up',
    follow_up_date: new Date(), // Today
    follow_up_time: '04:00 PM',
    source: 'manual',
    notes: "Today's follow-up: Needs clarification on Australian post-study work rights and regional migration points.",
  },
  {
    name: 'Prathiksha Joshi',
    phone_number: '+91 98810 33003',
    email: 'prathiksha.j@gmail.com',
    branch: BRANCHES.BELAGAVI,
    destination_country: 'United States',
    study_level: "Bachelor's",
    intake_target: 'Fall 2026',
    priority: 'medium',
    current_status: 'Confirm Visitor',
    source: 'meta_ads',
    notes: '12th standard student. Confirmed appointment to visit Belagavi office tomorrow at 2:00 PM with father.',
  },
  {
    name: 'Vinay Kulkarni',
    phone_number: '+91 98810 44004',
    email: 'vinay.kulkarni@gmail.com',
    branch: BRANCHES.BELAGAVI,
    destination_country: 'Germany',
    study_level: "Master's",
    intake_target: 'Winter 2026',
    priority: 'low',
    current_status: 'No Answer',
    total_call_attempts: 3,
    source: 'website',
    notes: 'Called three times on consecutive days with no response. WhatsApp introductory overview sent.',
  },
  {
    name: 'Aniket Deshmukh',
    phone_number: '+91 98810 55005',
    email: 'aniket.d@gmail.com',
    branch: BRANCHES.BELAGAVI,
    destination_country: 'United Kingdom',
    study_level: "Master's",
    intake_target: 'Fall 2026',
    priority: 'high',
    current_status: 'Interested',
    source: 'referral',
    notes: 'Civil engineer from KLS GIT Belagavi. Looking for MSc Structural Engineering in London.',
  },
];

// Candidates for Pipeline
const DUMMY_PIPELINE_DATA = [
  // ================= BENGALURU (HQ) =================
  {
    studentName: 'Rohan Sharma',
    email: 'rohan.sharma@example.com',
    phone: '+91 98451 12345',
    programme: 'MSc Advanced Computer Science',
    university: 'Imperial College London',
    destination: 'United Kingdom',
    intake: 'Fall 2026',
    branch: BRANCHES.BENGALURU,
    stage: PIPELINE_STAGES.OFFER_RECEIVED,
    documentsVerified: true,
    sopStatus: 'approved',
    counsellorName: 'Priya Nair',
    notes: 'Received unconditional offer with £5,000 Dean merit scholarship.',
  },
  {
    studentName: 'Ananya Patel',
    email: 'ananya.patel@example.com',
    phone: '+91 98452 23456',
    programme: 'Global Full-time MBA',
    university: 'Rotman School of Management',
    destination: 'Canada',
    intake: 'Fall 2026',
    branch: BRANCHES.BENGALURU,
    stage: PIPELINE_STAGES.APPLICATION_STARTED,
    documentsVerified: false,
    sopStatus: 'reviewed',
    counsellorName: 'Priya Nair',
    notes: 'GMAT score 720. Finalizing essays and recommendation letters.',
  },
  {
    studentName: 'Karthik Rao',
    email: 'karthik.rao@example.com',
    phone: '+91 98453 34567',
    programme: 'MSc Mechanical Engineering',
    university: 'TU Munich',
    destination: 'Germany',
    intake: 'Winter 2026',
    branch: BRANCHES.BENGALURU,
    stage: PIPELINE_STAGES.VISA_DECISION,
    documentsVerified: true,
    sopStatus: 'approved',
    counsellorName: 'Priya Nair',
    notes: 'German national student visa approved. Blocked account funded.',
  },
  {
    studentName: 'Sneha Reddy',
    email: 'sneha.reddy@example.com',
    phone: '+91 98454 45678',
    programme: 'MS Data Science & AI',
    university: 'National University of Singapore',
    destination: 'Singapore',
    intake: 'August 2026',
    branch: BRANCHES.BENGALURU,
    stage: PIPELINE_STAGES.SUBMITTED,
    documentsVerified: true,
    sopStatus: 'approved',
    counsellorName: 'Priya Nair',
    notes: 'Application submitted before early deadline. Interview scheduled.',
  },
  {
    studentName: 'Aditya Kulkarni',
    email: 'aditya.kulkarni@example.com',
    phone: '+91 98455 56789',
    programme: 'Master in Management (MiM)',
    university: 'HEC Paris',
    destination: 'France',
    intake: 'Fall 2026',
    branch: BRANCHES.BENGALURU,
    stage: PIPELINE_STAGES.COUNSELLING_COMPLETED,
    documentsVerified: false,
    sopStatus: 'pending',
    counsellorName: 'Priya Nair',
    notes: 'Profile evaluated. Recommended GRE re-take to target top 5 EU b-schools.',
  },
  {
    studentName: 'Rahul Nair',
    email: 'rahul.nair@example.com',
    phone: '+91 98456 67890',
    programme: 'MSc Artificial Intelligence',
    university: 'University of Edinburgh',
    destination: 'United Kingdom',
    intake: 'Fall 2026',
    branch: BRANCHES.BENGALURU,
    stage: PIPELINE_STAGES.ENROLLED,
    documentsVerified: true,
    sopStatus: 'approved',
    counsellorName: 'Priya Nair',
    notes: 'Tuition deposit paid. Flight booked. CAS issued.',
  },
  {
    studentName: 'Deepa Krishnan',
    email: 'deepa.krishnan@example.com',
    phone: '+91 98457 78901',
    programme: 'Master of Public Health (MPH)',
    university: 'Johns Hopkins University',
    destination: 'USA',
    intake: 'Fall 2026',
    branch: BRANCHES.BENGALURU,
    stage: PIPELINE_STAGES.NEW_ENQUIRY,
    documentsVerified: false,
    sopStatus: 'pending',
    counsellorName: 'Priya Nair',
    notes: 'Inbound enquiry via website form. Interested in STEM MPH programs.',
  },
  {
    studentName: 'Varun Hegde',
    email: 'varun.hegde@example.com',
    phone: '+91 98458 89012',
    programme: 'MSc Finance & Economics',
    university: 'London School of Economics',
    destination: 'United Kingdom',
    intake: 'Fall 2026',
    branch: BRANCHES.BENGALURU,
    stage: PIPELINE_STAGES.QUALIFIED,
    documentsVerified: false,
    sopStatus: 'pending',
    counsellorName: 'Priya Nair',
    notes: 'Strong undergraduate academic standing (9.2 CGPA from Christ Univ).',
  },
  {
    studentName: 'Tanvi Pai',
    email: 'tanvi.pai@example.com',
    phone: '+91 98459 90123',
    programme: 'MSc Biomedical Engineering',
    university: 'Trinity College Dublin',
    destination: 'Ireland',
    intake: 'Fall 2026',
    branch: BRANCHES.BENGALURU,
    stage: PIPELINE_STAGES.DEPOSIT_PAID,
    documentsVerified: true,
    sopStatus: 'approved',
    counsellorName: 'Priya Nair',
    notes: 'Deposit paid (€2,000). Visa slot booked at VFS Bangalore.',
  },
  {
    studentName: 'Chetan Kumar',
    email: 'chetan.kumar@example.com',
    phone: '+91 98460 01234',
    programme: 'MSc Cyber Security',
    university: 'Coventry University',
    destination: 'United Kingdom',
    intake: 'Fall 2026',
    branch: BRANCHES.BENGALURU,
    stage: PIPELINE_STAGES.DOCUMENTS_COMPLETE,
    documentsVerified: true,
    sopStatus: 'approved',
    counsellorName: 'Priya Nair',
    notes: 'All marksheets, IELTS TRF, and financial documents collected and verified.',
  },
  {
    studentName: 'Vikram Seth',
    email: 'vikram.seth@example.com',
    phone: '+91 98461 12340',
    programme: 'Master of Information Technology',
    university: 'University of Melbourne',
    destination: 'Australia',
    intake: 'July 2026',
    branch: BRANCHES.BENGALURU,
    stage: PIPELINE_STAGES.PRE_DEPARTURE,
    documentsVerified: true,
    sopStatus: 'approved',
    counsellorName: 'Priya Nair',
    notes: 'Pre-departure briefing attended. Accomodation reserved in Carlton.',
  },

  // ================= MYSURU =================
  {
    studentName: 'Bharath Urs',
    email: 'bharath.urs@example.com',
    phone: '+91 98221 11223',
    programme: 'MSc Aerospace Dynamics',
    university: 'Cranfield University',
    destination: 'United Kingdom',
    intake: 'Fall 2026',
    branch: BRANCHES.MYSURU,
    stage: PIPELINE_STAGES.OFFER_RECEIVED,
    documentsVerified: true,
    sopStatus: 'approved',
    counsellorName: 'Suresh Bhat',
    notes: 'Offer received. Evaluating scholarship options and ATAS certificate.',
  },
  {
    studentName: 'Sowmya Nayak',
    email: 'sowmya.nayak@example.com',
    phone: '+91 98222 22334',
    programme: 'Master of Business Analytics',
    university: 'Deakin University',
    destination: 'Australia',
    intake: 'November 2026',
    branch: BRANCHES.MYSURU,
    stage: PIPELINE_STAGES.APPLICATION_STARTED,
    documentsVerified: false,
    sopStatus: 'drafted',
    counsellorName: 'Suresh Bhat',
    notes: 'Targeting 20% STEM scholarship based on 8.6 CGPA from NIE Mysuru.',
  },
  {
    studentName: 'Harshavardhan Wadeyar',
    email: 'harsha.wadeyar@example.com',
    phone: '+91 98223 33445',
    programme: 'MSc Management',
    university: 'Trinity College Dublin',
    destination: 'Ireland',
    intake: 'Fall 2026',
    branch: BRANCHES.MYSURU,
    stage: PIPELINE_STAGES.QUALIFIED,
    documentsVerified: false,
    sopStatus: 'pending',
    counsellorName: 'Suresh Bhat',
    notes: 'Counselling session completed. Shortlisted 4 Irish universities.',
  },
  {
    studentName: 'Pallavi Shenoy',
    email: 'pallavi.shenoy@example.com',
    phone: '+91 98224 44556',
    programme: 'MS Applied Biotechnology',
    university: 'Uppsala University',
    destination: 'Sweden',
    intake: 'Autumn 2026',
    branch: BRANCHES.MYSURU,
    stage: PIPELINE_STAGES.VISA_FILED,
    documentsVerified: true,
    sopStatus: 'approved',
    counsellorName: 'Suresh Bhat',
    notes: 'Swedish residence permit application submitted to Migrationsverket.',
  },
  {
    studentName: 'Rakesh Prasad',
    email: 'rakesh.prasad@example.com',
    phone: '+91 98225 55667',
    programme: 'Master of Engineering Studies',
    university: 'University of Auckland',
    destination: 'New Zealand',
    intake: 'July 2026',
    branch: BRANCHES.MYSURU,
    stage: PIPELINE_STAGES.ENROLLED,
    documentsVerified: true,
    sopStatus: 'approved',
    counsellorName: 'Suresh Bhat',
    notes: 'Student visa granted. Tuition fee transferred.',
  },
  {
    studentName: 'Tejaswini M',
    email: 'tejaswini.m@example.com',
    phone: '+91 98226 66778',
    programme: 'MSc Data Science',
    university: 'University of Bristol',
    destination: 'United Kingdom',
    intake: 'Fall 2026',
    branch: BRANCHES.MYSURU,
    stage: PIPELINE_STAGES.CONTACTED,
    documentsVerified: false,
    sopStatus: 'pending',
    counsellorName: 'Suresh Bhat',
    notes: 'Shared university brochure and minimum IELTS criteria.',
  },

  // ================= BELAGAVI =================
  {
    studentName: 'Prathamesh Patil',
    email: 'prathamesh.patil@example.com',
    phone: '+91 98811 12345',
    programme: 'MSc Automotive Engineering',
    university: 'RWTH Aachen University',
    destination: 'Germany',
    intake: 'Winter 2026',
    branch: BRANCHES.BELAGAVI,
    stage: PIPELINE_STAGES.VISA_DECISION,
    documentsVerified: true,
    sopStatus: 'approved',
    counsellorName: 'Deepak Patil',
    notes: 'Visa interview successfully completed at German Consulate Mumbai.',
  },
  {
    studentName: 'Shruti Belgaonkar',
    email: 'shruti.belgaonkar@example.com',
    phone: '+91 98812 23456',
    programme: 'MS Computer Engineering',
    university: 'Arizona State University',
    destination: 'USA',
    intake: 'Fall 2026',
    branch: BRANCHES.BELAGAVI,
    stage: PIPELINE_STAGES.QUALIFIED,
    documentsVerified: false,
    sopStatus: 'pending',
    counsellorName: 'Deepak Patil',
    notes: 'GRE score 318 (Quant 167, Verbal 151). Shortlisting top 10 public universities.',
  },
  {
    studentName: 'Abhay Desai',
    email: 'abhay.desai@example.com',
    phone: '+91 98813 34567',
    programme: 'Master of International Business',
    university: 'University of British Columbia',
    destination: 'Canada',
    intake: 'Fall 2026',
    branch: BRANCHES.BELAGAVI,
    stage: PIPELINE_STAGES.OFFER_RECEIVED,
    documentsVerified: true,
    sopStatus: 'approved',
    counsellorName: 'Deepak Patil',
    notes: 'Offer letter received from Sauder School of Business.',
  },
  {
    studentName: 'Sanjana Kulkarni',
    email: 'sanjana.kulkarni@example.com',
    phone: '+91 98814 45678',
    programme: 'MS Food Quality & Safety',
    university: 'Wageningen University',
    destination: 'Netherlands',
    intake: 'September 2026',
    branch: BRANCHES.BELAGAVI,
    stage: PIPELINE_STAGES.APPLICATION_STARTED,
    documentsVerified: false,
    sopStatus: 'drafted',
    counsellorName: 'Deepak Patil',
    notes: 'Preparing motivation letter and academic curriculum match sheet.',
  },
  {
    studentName: 'Gauri Joshi',
    email: 'gauri.joshi@example.com',
    phone: '+91 98815 56789',
    programme: 'MEng Environmental Engineering',
    university: 'University of Alberta',
    destination: 'Canada',
    intake: 'Fall 2026',
    branch: BRANCHES.BELAGAVI,
    stage: PIPELINE_STAGES.ENROLLED,
    documentsVerified: true,
    sopStatus: 'approved',
    counsellorName: 'Deepak Patil',
    notes: 'Study permit approved. GIC funded via CIBC.',
  },
  {
    studentName: 'Omkar Chougule',
    email: 'omkar.chougule@example.com',
    phone: '+91 98816 67890',
    programme: 'MS Industrial Engineering',
    university: 'Politecnico di Milano',
    destination: 'Italy',
    intake: 'Fall 2026',
    branch: BRANCHES.BELAGAVI,
    stage: PIPELINE_STAGES.NEW_ENQUIRY,
    documentsVerified: false,
    sopStatus: 'pending',
    counsellorName: 'Deepak Patil',
    notes: 'Enquired about DSU regional scholarship in Lombardy, Italy.',
  },
];

// ==========================================
// DUMMY STAFF EMPLOYEES (Directory & Vault)
// ==========================================
const DUMMY_EMPLOYEES_DATA = [
  // --- BENGALURU (HQ) ---
  {
    first_name: 'Rajesh',
    last_name: 'Varma',
    employee_code: 'AET-101',
    email: 'manager.bengaluru@aeterna.com',
    branch: BRANCHES.BENGALURU,
    role: ROLES.BRANCH_MANAGER,
    department: 'Branch Management',
    designation: 'Branch Manager',
    employment_status: 'Active',
    profile_photo: '/staff/avatar-manager-m1.jpg',
    contact_info: {
      phone: '+91 98450 33445',
      address: '#14, 12th Main, Indiranagar, Bengaluru - 560038',
      emergency_contact_name: 'Lakshmi Varma (Spouse)',
      emergency_contact_phone: '+91 98450 99881',
    },
    deletionStage: 'ACTIVE',
  },
  {
    first_name: 'Priya',
    last_name: 'Nair',
    employee_code: 'AET-102',
    email: 'counsellor.bengaluru@aeterna.com',
    branch: BRANCHES.BENGALURU,
    role: ROLES.COUNSELLOR,
    department: 'Counselling & Admissions',
    designation: 'Senior Education Counsellor',
    employment_status: 'Active',
    profile_photo: '/staff/avatar-counsellor-f1.jpg',
    contact_info: {
      phone: '+91 98860 55667',
      address: '#45, 80ft Road, Koramangala 4th Block, Bengaluru - 560034',
      emergency_contact_name: 'Gopal Nair (Father)',
      emergency_contact_phone: '+91 98860 11229',
    },
    deletionStage: 'ACTIVE',
  },
  {
    first_name: 'Ananya',
    last_name: 'Rao',
    employee_code: 'AET-103',
    email: 'admissions@aeterna.com',
    branch: BRANCHES.BENGALURU,
    role: ROLES.APPLICATION_OFFICER,
    department: 'Application & Visa Processing',
    designation: 'Admissions Officer',
    employment_status: 'Active',
    profile_photo: '/staff/avatar-admissions-f2.jpg',
    contact_info: {
      phone: '+91 97400 99001',
      address: '#22, 5th Cross, Malleshwaram, Bengaluru - 560003',
      emergency_contact_name: 'Suma Rao (Mother)',
      emergency_contact_phone: '+91 97400 33441',
    },
    deletionStage: 'ACTIVE',
  },
  {
    first_name: 'Kavya',
    last_name: 'Hegde',
    employee_code: 'AET-104',
    email: 'kavya.hegde@aeterna.com',
    branch: BRANCHES.BENGALURU,
    role: ROLES.MARKETING,
    department: 'Marketing & Lead Generation',
    designation: 'Marketing Lead',
    employment_status: 'Active',
    profile_photo: '/staff/avatar-visa-m2.jpg',
    contact_info: {
      phone: '+91 98451 77665',
      address: '#108, HSR Layout Sector 1, Bengaluru - 560102',
      emergency_contact_name: 'Ashok Hegde (Father)',
      emergency_contact_phone: '+91 98451 00998',
    },
    deletionStage: 'ACTIVE',
  },
  {
    first_name: 'Rohan',
    last_name: 'Pai',
    employee_code: 'AET-105',
    email: 'rohan.pai@aeterna.com',
    branch: BRANCHES.BENGALURU,
    role: ROLES.COUNSELLOR,
    department: 'Student Operations',
    designation: 'Operations Executive',
    employment_status: 'Probation',
    profile_photo: '/staff/avatar-manager-m1.jpg',
    contact_info: {
      phone: '+91 98452 88990',
      address: '#33, JP Nagar 3rd Phase, Bengaluru - 560078',
      emergency_contact_name: 'Veena Pai (Mother)',
      emergency_contact_phone: '+91 98452 44332',
    },
    deletionStage: 'ACTIVE',
  },

  // --- MYSURU ---
  {
    first_name: 'Vikram',
    last_name: 'Joshi',
    employee_code: 'AET-201',
    email: 'manager.mysuru@aeterna.com',
    branch: BRANCHES.MYSURU,
    role: ROLES.BRANCH_MANAGER,
    department: 'Branch Management',
    designation: 'Branch Manager',
    employment_status: 'Active',
    profile_photo: '/staff/avatar-manager-m1.jpg',
    contact_info: {
      phone: '+91 98220 77889',
      address: '#19, Sayyaji Rao Road, Mandi Mohalla, Mysuru - 570021',
      emergency_contact_name: 'Anjali Joshi (Spouse)',
      emergency_contact_phone: '+91 98220 33441',
    },
    deletionStage: 'ACTIVE',
  },
  {
    first_name: 'Suresh',
    last_name: 'Bhat',
    employee_code: 'AET-202',
    email: 'counsellor.mysuru@aeterna.com',
    branch: BRANCHES.MYSURU,
    role: ROLES.COUNSELLOR,
    department: 'Counselling & Admissions',
    designation: 'Education Counsellor',
    employment_status: 'Active',
    profile_photo: '/staff/avatar-counsellor-f1.jpg',
    contact_info: {
      phone: '+91 98440 22334',
      address: '#88, Gokulam 3rd Stage, Mysuru - 570002',
      emergency_contact_name: 'Kavitha Bhat (Spouse)',
      emergency_contact_phone: '+91 98440 11998',
    },
    deletionStage: 'ACTIVE',
  },
  {
    first_name: 'Divya',
    last_name: 'Kulkarni',
    employee_code: 'AET-203',
    email: 'divya.kulkarni@aeterna.com',
    branch: BRANCHES.MYSURU,
    role: ROLES.COUNSELLOR,
    department: 'Counselling & Admissions',
    designation: 'Education Counsellor',
    employment_status: 'Active',
    profile_photo: '/staff/avatar-admissions-f2.jpg',
    contact_info: {
      phone: '+91 98441 55667',
      address: '#72, Kuvempunagar, Mysuru - 570023',
      emergency_contact_name: 'Shrikant Kulkarni (Father)',
      emergency_contact_phone: '+91 98441 88776',
    },
    deletionStage: 'ACTIVE',
  },

  // --- BELAGAVI ---
  {
    first_name: 'Mahesh',
    last_name: 'Kulkarni',
    employee_code: 'AET-301',
    email: 'manager.belagavi@aeterna.com',
    branch: BRANCHES.BELAGAVI,
    role: ROLES.BRANCH_MANAGER,
    department: 'Branch Management',
    designation: 'Branch Manager',
    employment_status: 'Active',
    profile_photo: '/staff/avatar-manager-m1.jpg',
    contact_info: {
      phone: '+91 98810 66778',
      address: '#56, College Road, Tilakwadi, Belagavi - 590006',
      emergency_contact_name: 'Pooja Kulkarni (Spouse)',
      emergency_contact_phone: '+91 98810 99887',
    },
    deletionStage: 'ACTIVE',
  },
  {
    first_name: 'Deepak',
    last_name: 'Patil',
    employee_code: 'AET-302',
    email: 'counsellor.belagavi@aeterna.com',
    branch: BRANCHES.BELAGAVI,
    role: ROLES.COUNSELLOR,
    department: 'Counselling & Admissions',
    designation: 'Senior Education Counsellor',
    employment_status: 'Active',
    profile_photo: '/staff/avatar-counsellor-f1.jpg',
    contact_info: {
      phone: '+91 98500 88990',
      address: '#12, Camp Area, Belagavi - 590001',
      emergency_contact_name: 'Sunil Patil (Brother)',
      emergency_contact_phone: '+91 98500 22331',
    },
    deletionStage: 'ACTIVE',
  },
  {
    first_name: 'Sunita',
    last_name: 'Deshmukh',
    employee_code: 'AET-303',
    email: 'sunita.deshmukh@aeterna.com',
    branch: BRANCHES.BELAGAVI,
    role: ROLES.MARKETING,
    department: 'Marketing & Lead Generation',
    designation: 'Telecaller & Lead Qualifier',
    employment_status: 'Active',
    profile_photo: '/staff/avatar-visa-m2.jpg',
    contact_info: {
      phone: '+91 98501 33445',
      address: '#90, Hindwadi, Belagavi - 590011',
      emergency_contact_name: 'Ajay Deshmukh (Spouse)',
      emergency_contact_phone: '+91 98501 77665',
    },
    deletionStage: 'ACTIVE',
  },

  // --- ARCHIVED / TRASH STAFF (Recovery Vault) ---
  {
    first_name: 'Harish',
    last_name: 'Shetty',
    employee_code: 'AET-901',
    email: 'harish.shetty@aeterna.com',
    branch: BRANCHES.BELAGAVI,
    role: ROLES.COUNSELLOR,
    department: 'Counselling & Admissions',
    designation: 'Education Counsellor',
    employment_status: 'Terminated',
    profile_photo: '/staff/avatar-manager-m1.jpg',
    contact_info: {
      phone: '+91 98509 99001',
      address: '#04, Shahapur, Belagavi - 590003',
      emergency_contact_name: 'Geetha Shetty (Spouse)',
      emergency_contact_phone: '+91 98509 44332',
    },
    deletionStage: 'TRASH',
    deleteReason: 'Resigned due to personal relocation to Pune',
    deletedAt: new Date(Date.now() - 6 * 86400000),
  },
  {
    first_name: 'Shilpa',
    last_name: 'Kamath',
    employee_code: 'AET-902',
    email: 'shilpa.kamath@aeterna.com',
    branch: BRANCHES.MYSURU,
    role: ROLES.MARKETING,
    department: 'Marketing & Lead Generation',
    designation: 'Marketing Lead',
    employment_status: 'Terminated',
    profile_photo: '/staff/avatar-visa-m2.jpg',
    contact_info: {
      phone: '+91 98449 88776',
      address: '#61, Saraswathipuram, Mysuru - 570009',
      emergency_contact_name: 'Ramesh Kamath (Father)',
      emergency_contact_phone: '+91 98449 11223',
    },
    deletionStage: 'TRASH',
    deleteReason: 'Fixed-term annual contract tenure concluded',
    deletedAt: new Date(Date.now() - 14 * 86400000),
  },
];

// ==========================================
// DUMMY LEAD INQUIRIES (Lead Management Hub)
// ==========================================
const DUMMY_LEADS_DATA = [
  // --- BENGALURU ---
  {
    name: 'Aditya Ramesh Rao',
    phone_number: '+91 98451 10001',
    email: 'aditya.rao@gmail.com',
    branch: BRANCHES.BENGALURU,
    destination_country: 'United Kingdom',
    study_level: "Master's",
    intake_target: 'Fall 2026',
    priority: 'high',
    current_status: 'New',
    source: 'website',
    notes: 'B.E. Computer Science from BMSCE (8.4 CGPA). Looking for MSc Data Science at Imperial College / UCL.',
  },
  {
    name: 'Meghana Sundaram',
    phone_number: '+91 98452 20002',
    email: 'meghana.s@yahoo.com',
    branch: BRANCHES.BENGALURU,
    destination_country: 'United States',
    study_level: "Master's",
    intake_target: 'Fall 2026',
    priority: 'high',
    current_status: 'Assigned',
    source: 'meta_ads',
    notes: 'GRE score 322 (Q168, V154). Interested in MS CS at UT Austin, Purdue, and Arizona State.',
  },
  {
    name: 'Nikhil Gowda',
    phone_number: '+91 98453 30003',
    email: 'nikhil.gowda@gmail.com',
    branch: BRANCHES.BENGALURU,
    destination_country: 'Germany',
    study_level: "Master's",
    intake_target: 'Winter 2026',
    priority: 'medium',
    current_status: 'Follow Up',
    follow_up_date: new Date(Date.now() + 86400000),
    follow_up_time: '11:30 AM',
    source: 'walk_in',
    notes: 'Mechanical engineer looking for English-taught automotive programs at TU Munich and RWTH Aachen.',
  },
  {
    name: 'Pooja Hegde',
    phone_number: '+91 98454 40004',
    email: 'pooja.hegde@hotmail.com',
    branch: BRANCHES.BENGALURU,
    destination_country: 'Ireland',
    study_level: "Master's",
    intake_target: 'Fall 2026',
    priority: 'medium',
    current_status: 'Interested',
    source: 'referral',
    notes: 'Finance graduate interested in MSc FinTech at Trinity College Dublin or UCD Michael Smurfit.',
  },
  {
    name: 'Kiran Kumar',
    phone_number: '+91 98455 50005',
    email: 'kiran.k99@gmail.com',
    branch: BRANCHES.BENGALURU,
    destination_country: 'Canada',
    study_level: 'Diploma',
    intake_target: 'January 2027',
    priority: 'low',
    current_status: 'Only WhatsApp',
    source: 'google_sheet',
    notes: 'Prefers chat communication only due to busy shift hours in IT company.',
  },
  {
    name: 'Tejaswini Shetty',
    phone_number: '+91 98456 60006',
    email: 'tejaswini.s@gmail.com',
    branch: BRANCHES.BENGALURU,
    destination_country: 'United Kingdom',
    study_level: "Master's",
    intake_target: 'Fall 2026',
    priority: 'high',
    current_status: 'Visited',
    source: 'walk_in',
    notes: 'In-person counseling session completed at Bengaluru Hub. Shortlisted Manchester and Bristol.',
  },
  {
    name: 'Manjunath Naik',
    phone_number: '+91 98457 70007',
    email: 'manjunath.naik@gmail.com',
    branch: BRANCHES.BENGALURU,
    destination_country: 'Australia',
    study_level: "Master's",
    intake_target: 'July 2026',
    priority: 'medium',
    current_status: 'New',
    source: 'website',
    notes: 'Fresh inquiry for Master of Information Technology at Monash or UNSW.',
  },

  // --- MYSURU ---
  {
    name: 'Darshan Wadeyar',
    phone_number: '+91 98220 11001',
    email: 'darshan.w@gmail.com',
    branch: BRANCHES.MYSURU,
    destination_country: 'United Kingdom',
    study_level: "Master's",
    intake_target: 'Fall 2026',
    priority: 'high',
    current_status: 'Deal Closed',
    source: 'walk_in',
    notes: 'Admissions consulting package finalized! Applications submitted to University of Edinburgh.',
  },
  {
    name: 'Shruthi Prasad',
    phone_number: '+91 98220 22002',
    email: 'shruthi.prasad@gmail.com',
    branch: BRANCHES.MYSURU,
    destination_country: 'Ireland',
    study_level: "Master's",
    intake_target: 'Fall 2026',
    priority: 'high',
    current_status: 'Assigned',
    source: 'website',
    notes: 'B.Pharm graduate from JSS Mysuru seeking MSc Pharmacology at NUI Galway.',
  },
  {
    name: 'Girish Urs',
    phone_number: '+91 98220 33003',
    email: 'girish.urs@yahoo.com',
    branch: BRANCHES.MYSURU,
    destination_country: 'United States',
    study_level: "Master's",
    intake_target: 'Fall 2026',
    priority: 'medium',
    current_status: 'Follow Up',
    follow_up_date: new Date(Date.now() - 86400000), // Overdue
    follow_up_time: '02:30 PM',
    source: 'referral',
    notes: 'Overdue follow up: Call student to discuss bank solvency certificate and I-20 financial requirements.',
  },
  {
    name: 'Aishwarya Deshpande',
    phone_number: '+91 98220 44004',
    email: 'aishwarya.d@gmail.com',
    branch: BRANCHES.MYSURU,
    destination_country: 'Canada',
    study_level: "Master's",
    intake_target: 'Fall 2026',
    priority: 'low',
    current_status: 'Not Interested',
    source: 'google_sheet',
    notes: 'Decided to continue current software engineering position at Infosys Mysuru for another year.',
  },
  {
    name: 'Vinayak Shastry',
    phone_number: '+91 98220 55005',
    email: 'vinayak.shastry@gmail.com',
    branch: BRANCHES.MYSURU,
    destination_country: 'Australia',
    study_level: 'MBA',
    intake_target: 'November 2026',
    priority: 'high',
    current_status: 'Confirm Visitor',
    source: 'walk_in',
    notes: 'Confirmed in-person appointment for profile evaluation this Saturday at Mysuru branch.',
  },

  // --- BELAGAVI ---
  {
    name: 'Sneha Belagavi',
    phone_number: '+91 98810 11001',
    email: 'sneha.b@gmail.com',
    branch: BRANCHES.BELAGAVI,
    destination_country: 'United Kingdom',
    study_level: 'MBA',
    intake_target: 'Fall 2026',
    priority: 'high',
    current_status: 'Visited',
    source: 'walk_in',
    notes: 'Visited Belagavi office with parents. Discussed 1-year MBA programs at Warwick and Cranfield.',
  },
  {
    name: 'Akash Patil',
    phone_number: '+91 98810 22002',
    email: 'akash.patil@outlook.com',
    branch: BRANCHES.BELAGAVI,
    destination_country: 'Australia',
    study_level: "Master's",
    intake_target: 'July 2026',
    priority: 'medium',
    current_status: 'Follow Up',
    follow_up_date: new Date(), // Today
    follow_up_time: '04:00 PM',
    source: 'manual',
    notes: "Today's follow-up: Needs clarification on Australian post-study work rights and regional migration points.",
  },
  {
    name: 'Prathiksha Joshi',
    phone_number: '+91 98810 33003',
    email: 'prathiksha.j@gmail.com',
    branch: BRANCHES.BELAGAVI,
    destination_country: 'United States',
    study_level: "Bachelor's",
    intake_target: 'Fall 2026',
    priority: 'medium',
    current_status: 'Confirm Visitor',
    source: 'meta_ads',
    notes: '12th standard student. Confirmed appointment to visit Belagavi office tomorrow at 2:00 PM with father.',
  },
  {
    name: 'Vinay Kulkarni',
    phone_number: '+91 98810 44004',
    email: 'vinay.kulkarni@gmail.com',
    branch: BRANCHES.BELAGAVI,
    destination_country: 'Germany',
    study_level: "Master's",
    intake_target: 'Winter 2026',
    priority: 'low',
    current_status: 'No Answer',
    total_call_attempts: 3,
    source: 'website',
    notes: 'Called three times on consecutive days with no response. WhatsApp introductory overview sent.',
  },
  {
    name: 'Aniket Deshmukh',
    phone_number: '+91 98810 55005',
    email: 'aniket.d@gmail.com',
    branch: BRANCHES.BELAGAVI,
    destination_country: 'United Kingdom',
    study_level: "Master's",
    intake_target: 'Fall 2026',
    priority: 'high',
    current_status: 'Interested',
    source: 'referral',
    notes: 'Civil engineer from KLS GIT Belagavi. Looking for MSc Structural Engineering in London.',
  },
];

const DUMMY_STUDENT_PROFILES = [
  {
    studentId: 'AET-BLR-2026-0001',
    studentName: 'Rohan Sharma',
    email: 'rohan.sharma@example.com',
    phone: '+91 98451 12345',
    branch: BRANCHES.BENGALURU,
    status: STUDENT_STATUS.ACTIVE,
    assignedCounsellorName: 'Priya Nair',
    assignedApplicationOfficerName: 'Ananya Rao',
    identity: {
      dateOfBirth: new Date('2001-08-14'),
      gender: 'male',
      nationality: 'Indian',
      passport: {
        passportNumber: 'Z8941203',
        expiryDate: new Date('2032-05-19'),
        issuingCountry: 'India',
      },
    },
    academics: {
      qualifications: [
        {
          level: 'tenth',
          institution: 'Delhi Public School, Bangalore',
          boardOrUniversity: 'CBSE',
          yearOfPassing: 2017,
          score: '92.4%',
          gradingSystem: 'percentage',
        },
        {
          level: 'twelfth',
          institution: 'National Public School, Indiranagar',
          boardOrUniversity: 'CBSE',
          yearOfPassing: 2019,
          score: '89.6%',
          gradingSystem: 'percentage',
        },
        {
          level: 'bachelors',
          institution: 'BMS College of Engineering, Bengaluru',
          boardOrUniversity: 'VTU Belagavi',
          yearOfPassing: 2023,
          score: '8.85',
          gradingSystem: 'cgpa_10',
          major: 'Computer Science and Engineering',
        },
      ],
      backlogs: 0,
      workExperienceMonths: 24,
    },
    testScores: [
      {
        testType: TEST_SCORE_TYPES.IELTS,
        overallScore: 7.5,
        subScores: {
          listening: 8.0,
          reading: 7.5,
          writing: 7.0,
          speaking: 7.5,
        },
        testDate: new Date('2025-09-12'),
        validUntil: new Date('2027-09-12'),
        trfNumber: '25IN088219SHAR',
        isVerified: true,
      },
    ],
    financial: {
      estimatedBudget: 4200000,
      currency: 'INR',
      fundingSources: ['education_loan', 'family_savings'],
      loanDetails: {
        status: 'sanctioned',
        bankName: 'HDFC Credila',
        sanctionedAmount: 3500000,
      },
      sponsorDetails: {
        relationship: 'Father',
        occupation: 'Software Architect',
        annualIncome: 2400000,
      },
    },
    preferences: {
      destinationCountries: ['United Kingdom', 'Ireland'],
      targetDegree: 'postgraduate',
      targetCourse: 'MSc Advanced Computer Science',
      intakeSeason: 'Fall 2026',
    },
    applications: [
      {
        universityName: 'Imperial College London',
        programme: 'MSc Advanced Computer Science',
        country: 'United Kingdom',
        status: 'unconditional_offer',
        submittedDate: new Date('2025-11-01'),
        offerLetterDate: new Date('2026-01-15'),
      },
      {
        universityName: 'University College London',
        programme: 'MSc Computer Science',
        country: 'United Kingdom',
        status: 'submitted',
        submittedDate: new Date('2025-11-05'),
      },
    ],
    notes: [
      {
        content: 'Candidate is extremely confident and technical. Aiming for Tier 1 UK universities.',
        category: 'counselling',
        authorName: 'Priya Nair',
      },
    ],
  },
  {
    studentId: 'AET-BLR-2026-0002',
    studentName: 'Karthik Rao',
    email: 'karthik.rao@example.com',
    phone: '+91 98453 34567',
    branch: BRANCHES.BENGALURU,
    status: STUDENT_STATUS.VISA_APPROVED,
    assignedCounsellorName: 'Priya Nair',
    assignedApplicationOfficerName: 'Ananya Rao',
    identity: {
      dateOfBirth: new Date('2000-11-22'),
      gender: 'male',
      nationality: 'Indian',
      passport: {
        passportNumber: 'M4518920',
        expiryDate: new Date('2031-10-14'),
        issuingCountry: 'India',
      },
    },
    academics: {
      qualifications: [
        {
          level: 'tenth',
          institution: 'St. Joseph Indian High School',
          boardOrUniversity: 'Karnataka State',
          yearOfPassing: 2016,
          score: '91.2%',
          gradingSystem: 'percentage',
        },
        {
          level: 'twelfth',
          institution: 'St. Joseph Pre-University College',
          boardOrUniversity: 'Karnataka PU Board',
          yearOfPassing: 2018,
          score: '87.4%',
          gradingSystem: 'percentage',
        },
        {
          level: 'bachelors',
          institution: 'RV College of Engineering',
          boardOrUniversity: 'VTU',
          yearOfPassing: 2022,
          score: '8.4',
          gradingSystem: 'cgpa_10',
          major: 'Mechanical Engineering',
        },
      ],
      backlogs: 0,
      workExperienceMonths: 36,
    },
    testScores: [
      {
        testType: TEST_SCORE_TYPES.TOEFL,
        overallScore: 104,
        subScores: {
          reading: 28,
          listening: 27,
          speaking: 24,
          writing: 25,
        },
        testDate: new Date('2025-06-20'),
        validUntil: new Date('2027-06-20'),
        trfNumber: 'TOEFL-00918237',
        isVerified: true,
      },
    ],
    financial: {
      estimatedBudget: 2800000,
      currency: 'INR',
      fundingSources: ['blocked_account', 'family_savings'],
      loanDetails: {
        status: 'disbursed',
        bankName: 'SBI Global Ed-Vantage',
        sanctionedAmount: 2200000,
      },
      sponsorDetails: {
        relationship: 'Mother',
        occupation: 'Senior Bank Manager',
        annualIncome: 1900000,
      },
    },
    preferences: {
      destinationCountries: ['Germany'],
      targetDegree: 'postgraduate',
      targetCourse: 'MSc Mechanical Engineering',
      intakeSeason: 'Winter 2026',
    },
    applications: [
      {
        universityName: 'TU Munich',
        programme: 'MSc Mechanical Engineering',
        country: 'Germany',
        status: 'visa_granted',
        submittedDate: new Date('2025-08-15'),
        offerLetterDate: new Date('2025-10-30'),
      },
    ],
    notes: [
      {
        content: 'German visa stamped. Fintiba blocked account confirmed with €11,904.',
        category: 'visa',
        authorName: 'Ananya Rao',
      },
    ],
  },
  {
    studentId: 'AET-MYS-2026-0001',
    studentName: 'Bharath Urs',
    email: 'bharath.urs@example.com',
    phone: '+91 98221 11223',
    branch: BRANCHES.MYSURU,
    status: STUDENT_STATUS.ACTIVE,
    assignedCounsellorName: 'Suresh Bhat',
    assignedApplicationOfficerName: 'Ananya Rao',
    identity: {
      dateOfBirth: new Date('2002-04-10'),
      gender: 'male',
      nationality: 'Indian',
      passport: {
        passportNumber: 'P7829104',
        expiryDate: new Date('2033-01-20'),
        issuingCountry: 'India',
      },
    },
    academics: {
      qualifications: [
        {
          level: 'tenth',
          institution: 'Demonstration School, Mysuru',
          boardOrUniversity: 'CBSE',
          yearOfPassing: 2018,
          score: '88.5%',
          gradingSystem: 'percentage',
        },
        {
          level: 'twelfth',
          institution: 'Marimallappa PU College, Mysuru',
          boardOrUniversity: 'Karnataka PU Board',
          yearOfPassing: 2020,
          score: '86.0%',
          gradingSystem: 'percentage',
        },
        {
          level: 'bachelors',
          institution: 'National Institute of Engineering (NIE), Mysuru',
          boardOrUniversity: 'Autonomous VTU',
          yearOfPassing: 2024,
          score: '8.35',
          gradingSystem: 'cgpa_10',
          major: 'Aeronautical Engineering',
        },
      ],
      backlogs: 0,
      workExperienceMonths: 12,
    },
    testScores: [
      {
        testType: TEST_SCORE_TYPES.IELTS,
        overallScore: 7.0,
        subScores: {
          listening: 7.5,
          reading: 7.0,
          writing: 6.5,
          speaking: 7.0,
        },
        testDate: new Date('2025-10-05'),
        validUntil: new Date('2027-10-05'),
        trfNumber: '25IN099182URS',
        isVerified: true,
      },
    ],
    financial: {
      estimatedBudget: 3800000,
      currency: 'INR',
      fundingSources: ['education_loan'],
      loanDetails: {
        status: 'sanctioned',
        bankName: 'Avanse Financial',
        sanctionedAmount: 3000000,
      },
      sponsorDetails: {
        relationship: 'Father',
        occupation: 'Government Officer',
        annualIncome: 1450000,
      },
    },
    preferences: {
      destinationCountries: ['United Kingdom'],
      targetDegree: 'postgraduate',
      targetCourse: 'MSc Aerospace Dynamics',
      intakeSeason: 'Fall 2026',
    },
    applications: [
      {
        universityName: 'Cranfield University',
        programme: 'MSc Aerospace Dynamics',
        country: 'United Kingdom',
        status: 'conditional_offer',
        submittedDate: new Date('2025-11-20'),
        offerLetterDate: new Date('2026-01-22'),
      },
    ],
    notes: [
      {
        content: 'ATAS application draft reviewed. Waiting for official academic reference letters.',
        category: 'counselling',
        authorName: 'Suresh Bhat',
      },
    ],
  },
  {
    studentId: 'AET-BEL-2026-0001',
    studentName: 'Prathamesh Patil',
    email: 'prathamesh.patil@example.com',
    phone: '+91 98811 12345',
    branch: BRANCHES.BELAGAVI,
    status: STUDENT_STATUS.ACTIVE,
    assignedCounsellorName: 'Deepak Patil',
    assignedApplicationOfficerName: 'Ananya Rao',
    identity: {
      dateOfBirth: new Date('2001-02-18'),
      gender: 'male',
      nationality: 'Indian',
      passport: {
        passportNumber: 'R1928475',
        expiryDate: new Date('2032-09-30'),
        issuingCountry: 'India',
      },
    },
    academics: {
      qualifications: [
        {
          level: 'tenth',
          institution: 'St. Paul High School, Belagavi',
          boardOrUniversity: 'Karnataka State',
          yearOfPassing: 2017,
          score: '93.5%',
          gradingSystem: 'percentage',
        },
        {
          level: 'twelfth',
          institution: 'Govindram Seksaria PU College, Belagavi',
          boardOrUniversity: 'Karnataka PU Board',
          yearOfPassing: 2019,
          score: '90.2%',
          gradingSystem: 'percentage',
        },
        {
          level: 'bachelors',
          institution: 'KLS Gogte Institute of Technology, Belagavi',
          boardOrUniversity: 'Autonomous VTU',
          yearOfPassing: 2023,
          score: '8.7',
          gradingSystem: 'cgpa_10',
          major: 'Mechanical Engineering',
        },
      ],
      backlogs: 0,
      workExperienceMonths: 20,
    },
    testScores: [
      {
        testType: TEST_SCORE_TYPES.PTE,
        overallScore: 78,
        subScores: {
          listening: 80,
          reading: 76,
          writing: 79,
          speaking: 77,
        },
        testDate: new Date('2025-08-10'),
        validUntil: new Date('2027-08-10'),
        trfNumber: 'PTE-2025-998812',
        isVerified: true,
      },
    ],
    financial: {
      estimatedBudget: 2500000,
      currency: 'INR',
      fundingSources: ['blocked_account', 'family_savings'],
      loanDetails: {
        status: 'sanctioned',
        bankName: 'Canara Bank',
        sanctionedAmount: 2000000,
      },
      sponsorDetails: {
        relationship: 'Father',
        occupation: 'Business Owner',
        annualIncome: 1600000,
      },
    },
    preferences: {
      destinationCountries: ['Germany'],
      targetDegree: 'postgraduate',
      targetCourse: 'MSc Automotive Engineering',
      intakeSeason: 'Winter 2026',
    },
    applications: [
      {
        universityName: 'RWTH Aachen University',
        programme: 'MSc Automotive Engineering',
        country: 'Germany',
        status: 'conditional_offer',
        submittedDate: new Date('2025-09-01'),
        offerLetterDate: new Date('2025-12-10'),
      },
    ],
    notes: [
      {
        content: 'German consulate Mumbai interview passed. Visa stamping in progress.',
        category: 'visa',
        authorName: 'Deepak Patil',
      },
    ],
  },
];



// ==========================================
// DUMMY STAFF EMPLOYEES (Directory & Vault)
// ==========================================
const DUMMY_EMPLOYEES_DATA = [
  // --- BENGALURU (HQ) ---
  {
    first_name: 'Rajesh',
    last_name: 'Varma',
    employee_code: 'AET-101',
    email: 'manager.bengaluru@aeterna.com',
    branch: BRANCHES.BENGALURU,
    role: ROLES.BRANCH_MANAGER,
    department: 'Branch Management',
    designation: 'Branch Manager',
    employment_status: 'Active',
    profile_photo: '/staff/avatar-manager-m1.jpg',
    contact_info: {
      phone: '+91 98450 33445',
      address: '#14, 12th Main, Indiranagar, Bengaluru - 560038',
      emergency_contact_name: 'Lakshmi Varma (Spouse)',
      emergency_contact_phone: '+91 98450 99881',
    },
    deletionStage: 'ACTIVE',
  },
  {
    first_name: 'Priya',
    last_name: 'Nair',
    employee_code: 'AET-102',
    email: 'counsellor.bengaluru@aeterna.com',
    branch: BRANCHES.BENGALURU,
    role: ROLES.COUNSELLOR,
    department: 'Counselling & Admissions',
    designation: 'Senior Education Counsellor',
    employment_status: 'Active',
    profile_photo: '/staff/avatar-counsellor-f1.jpg',
    contact_info: {
      phone: '+91 98860 55667',
      address: '#45, 80ft Road, Koramangala 4th Block, Bengaluru - 560034',
      emergency_contact_name: 'Gopal Nair (Father)',
      emergency_contact_phone: '+91 98860 11229',
    },
    deletionStage: 'ACTIVE',
  },
  {
    first_name: 'Ananya',
    last_name: 'Rao',
    employee_code: 'AET-103',
    email: 'admissions@aeterna.com',
    branch: BRANCHES.BENGALURU,
    role: ROLES.APPLICATION_OFFICER,
    department: 'Application & Visa Processing',
    designation: 'Admissions Officer',
    employment_status: 'Active',
    profile_photo: '/staff/avatar-admissions-f2.jpg',
    contact_info: {
      phone: '+91 97400 99001',
      address: '#22, 5th Cross, Malleshwaram, Bengaluru - 560003',
      emergency_contact_name: 'Suma Rao (Mother)',
      emergency_contact_phone: '+91 97400 33441',
    },
    deletionStage: 'ACTIVE',
  },
  {
    first_name: 'Kavya',
    last_name: 'Hegde',
    employee_code: 'AET-104',
    email: 'kavya.hegde@aeterna.com',
    branch: BRANCHES.BENGALURU,
    role: ROLES.MARKETING,
    department: 'Marketing & Lead Generation',
    designation: 'Marketing Lead',
    employment_status: 'Active',
    profile_photo: '/staff/avatar-visa-m2.jpg',
    contact_info: {
      phone: '+91 98451 77665',
      address: '#108, HSR Layout Sector 1, Bengaluru - 560102',
      emergency_contact_name: 'Ashok Hegde (Father)',
      emergency_contact_phone: '+91 98451 00998',
    },
    deletionStage: 'ACTIVE',
  },
  {
    first_name: 'Rohan',
    last_name: 'Pai',
    employee_code: 'AET-105',
    email: 'rohan.pai@aeterna.com',
    branch: BRANCHES.BENGALURU,
    role: ROLES.COUNSELLOR,
    department: 'Student Operations',
    designation: 'Operations Executive',
    employment_status: 'Probation',
    profile_photo: '/staff/avatar-manager-m1.jpg',
    contact_info: {
      phone: '+91 98452 88990',
      address: '#33, JP Nagar 3rd Phase, Bengaluru - 560078',
      emergency_contact_name: 'Veena Pai (Mother)',
      emergency_contact_phone: '+91 98452 44332',
    },
    deletionStage: 'ACTIVE',
  },

  // --- MYSURU ---
  {
    first_name: 'Vikram',
    last_name: 'Joshi',
    employee_code: 'AET-201',
    email: 'manager.mysuru@aeterna.com',
    branch: BRANCHES.MYSURU,
    role: ROLES.BRANCH_MANAGER,
    department: 'Branch Management',
    designation: 'Branch Manager',
    employment_status: 'Active',
    profile_photo: '/staff/avatar-manager-m1.jpg',
    contact_info: {
      phone: '+91 98220 77889',
      address: '#19, Sayyaji Rao Road, Mandi Mohalla, Mysuru - 570021',
      emergency_contact_name: 'Anjali Joshi (Spouse)',
      emergency_contact_phone: '+91 98220 33441',
    },
    deletionStage: 'ACTIVE',
  },
  {
    first_name: 'Suresh',
    last_name: 'Bhat',
    employee_code: 'AET-202',
    email: 'counsellor.mysuru@aeterna.com',
    branch: BRANCHES.MYSURU,
    role: ROLES.COUNSELLOR,
    department: 'Counselling & Admissions',
    designation: 'Education Counsellor',
    employment_status: 'Active',
    profile_photo: '/staff/avatar-counsellor-f1.jpg',
    contact_info: {
      phone: '+91 98440 22334',
      address: '#88, Gokulam 3rd Stage, Mysuru - 570002',
      emergency_contact_name: 'Kavitha Bhat (Spouse)',
      emergency_contact_phone: '+91 98440 11998',
    },
    deletionStage: 'ACTIVE',
  },
  {
    first_name: 'Divya',
    last_name: 'Kulkarni',
    employee_code: 'AET-203',
    email: 'divya.kulkarni@aeterna.com',
    branch: BRANCHES.MYSURU,
    role: ROLES.COUNSELLOR,
    department: 'Counselling & Admissions',
    designation: 'Education Counsellor',
    employment_status: 'Active',
    profile_photo: '/staff/avatar-admissions-f2.jpg',
    contact_info: {
      phone: '+91 98441 55667',
      address: '#72, Kuvempunagar, Mysuru - 570023',
      emergency_contact_name: 'Shrikant Kulkarni (Father)',
      emergency_contact_phone: '+91 98441 88776',
    },
    deletionStage: 'ACTIVE',
  },

  // --- BELAGAVI ---
  {
    first_name: 'Mahesh',
    last_name: 'Kulkarni',
    employee_code: 'AET-301',
    email: 'manager.belagavi@aeterna.com',
    branch: BRANCHES.BELAGAVI,
    role: ROLES.BRANCH_MANAGER,
    department: 'Branch Management',
    designation: 'Branch Manager',
    employment_status: 'Active',
    profile_photo: '/staff/avatar-manager-m1.jpg',
    contact_info: {
      phone: '+91 98810 66778',
      address: '#56, College Road, Tilakwadi, Belagavi - 590006',
      emergency_contact_name: 'Pooja Kulkarni (Spouse)',
      emergency_contact_phone: '+91 98810 99887',
    },
    deletionStage: 'ACTIVE',
  },
  {
    first_name: 'Deepak',
    last_name: 'Patil',
    employee_code: 'AET-302',
    email: 'counsellor.belagavi@aeterna.com',
    branch: BRANCHES.BELAGAVI,
    role: ROLES.COUNSELLOR,
    department: 'Counselling & Admissions',
    designation: 'Senior Education Counsellor',
    employment_status: 'Active',
    profile_photo: '/staff/avatar-counsellor-f1.jpg',
    contact_info: {
      phone: '+91 98500 88990',
      address: '#12, Camp Area, Belagavi - 590001',
      emergency_contact_name: 'Sunil Patil (Brother)',
      emergency_contact_phone: '+91 98500 22331',
    },
    deletionStage: 'ACTIVE',
  },
  {
    first_name: 'Sunita',
    last_name: 'Deshmukh',
    employee_code: 'AET-303',
    email: 'sunita.deshmukh@aeterna.com',
    branch: BRANCHES.BELAGAVI,
    role: ROLES.MARKETING,
    department: 'Marketing & Lead Generation',
    designation: 'Telecaller & Lead Qualifier',
    employment_status: 'Active',
    profile_photo: '/staff/avatar-visa-m2.jpg',
    contact_info: {
      phone: '+91 98501 33445',
      address: '#90, Hindwadi, Belagavi - 590011',
      emergency_contact_name: 'Ajay Deshmukh (Spouse)',
      emergency_contact_phone: '+91 98501 77665',
    },
    deletionStage: 'ACTIVE',
  },

  // --- ARCHIVED / TRASH STAFF (Recovery Vault) ---
  {
    first_name: 'Harish',
    last_name: 'Shetty',
    employee_code: 'AET-901',
    email: 'harish.shetty@aeterna.com',
    branch: BRANCHES.BELAGAVI,
    role: ROLES.COUNSELLOR,
    department: 'Counselling & Admissions',
    designation: 'Education Counsellor',
    employment_status: 'Terminated',
    profile_photo: '/staff/avatar-manager-m1.jpg',
    contact_info: {
      phone: '+91 98509 99001',
      address: '#04, Shahapur, Belagavi - 590003',
      emergency_contact_name: 'Geetha Shetty (Spouse)',
      emergency_contact_phone: '+91 98509 44332',
    },
    deletionStage: 'TRASH',
    deleteReason: 'Resigned due to personal relocation to Pune',
    deletedAt: new Date(Date.now() - 6 * 86400000),
  },
  {
    first_name: 'Shilpa',
    last_name: 'Kamath',
    employee_code: 'AET-902',
    email: 'shilpa.kamath@aeterna.com',
    branch: BRANCHES.MYSURU,
    role: ROLES.MARKETING,
    department: 'Marketing & Lead Generation',
    designation: 'Marketing Lead',
    employment_status: 'Terminated',
    profile_photo: '/staff/avatar-visa-m2.jpg',
    contact_info: {
      phone: '+91 98449 88776',
      address: '#61, Saraswathipuram, Mysuru - 570009',
      emergency_contact_name: 'Ramesh Kamath (Father)',
      emergency_contact_phone: '+91 98449 11223',
    },
    deletionStage: 'TRASH',
    deleteReason: 'Fixed-term annual contract tenure concluded',
    deletedAt: new Date(Date.now() - 14 * 86400000),
  },
];

// ==========================================
// DUMMY LEAD INQUIRIES (Lead Management Hub)
// ==========================================
const DUMMY_LEADS_DATA = [
  // --- BENGALURU ---
  {
    name: 'Aditya Ramesh Rao',
    phone_number: '+91 98451 10001',
    email: 'aditya.rao@gmail.com',
    branch: BRANCHES.BENGALURU,
    destination_country: 'United Kingdom',
    study_level: "Master's",
    intake_target: 'Fall 2026',
    priority: 'high',
    current_status: 'New',
    source: 'website',
    notes: 'B.E. Computer Science from BMSCE (8.4 CGPA). Looking for MSc Data Science at Imperial College / UCL.',
  },
  {
    name: 'Meghana Sundaram',
    phone_number: '+91 98452 20002',
    email: 'meghana.s@yahoo.com',
    branch: BRANCHES.BENGALURU,
    destination_country: 'United States',
    study_level: "Master's",
    intake_target: 'Fall 2026',
    priority: 'high',
    current_status: 'Assigned',
    source: 'meta_ads',
    notes: 'GRE score 322 (Q168, V154). Interested in MS CS at UT Austin, Purdue, and Arizona State.',
  },
  {
    name: 'Nikhil Gowda',
    phone_number: '+91 98453 30003',
    email: 'nikhil.gowda@gmail.com',
    branch: BRANCHES.BENGALURU,
    destination_country: 'Germany',
    study_level: "Master's",
    intake_target: 'Winter 2026',
    priority: 'medium',
    current_status: 'Follow Up',
    follow_up_date: new Date(Date.now() + 86400000),
    follow_up_time: '11:30 AM',
    source: 'walk_in',
    notes: 'Mechanical engineer looking for English-taught automotive programs at TU Munich and RWTH Aachen.',
  },
  {
    name: 'Pooja Hegde',
    phone_number: '+91 98454 40004',
    email: 'pooja.hegde@hotmail.com',
    branch: BRANCHES.BENGALURU,
    destination_country: 'Ireland',
    study_level: "Master's",
    intake_target: 'Fall 2026',
    priority: 'medium',
    current_status: 'Interested',
    source: 'referral',
    notes: 'Finance graduate interested in MSc FinTech at Trinity College Dublin or UCD Michael Smurfit.',
  },
  {
    name: 'Kiran Kumar',
    phone_number: '+91 98455 50005',
    email: 'kiran.k99@gmail.com',
    branch: BRANCHES.BENGALURU,
    destination_country: 'Canada',
    study_level: 'Diploma',
    intake_target: 'January 2027',
    priority: 'low',
    current_status: 'Only WhatsApp',
    source: 'google_sheet',
    notes: 'Prefers chat communication only due to busy shift hours in IT company.',
  },
  {
    name: 'Tejaswini Shetty',
    phone_number: '+91 98456 60006',
    email: 'tejaswini.s@gmail.com',
    branch: BRANCHES.BENGALURU,
    destination_country: 'United Kingdom',
    study_level: "Master's",
    intake_target: 'Fall 2026',
    priority: 'high',
    current_status: 'Visited',
    source: 'walk_in',
    notes: 'In-person counseling session completed at Bengaluru Hub. Shortlisted Manchester and Bristol.',
  },
  {
    name: 'Manjunath Naik',
    phone_number: '+91 98457 70007',
    email: 'manjunath.naik@gmail.com',
    branch: BRANCHES.BENGALURU,
    destination_country: 'Australia',
    study_level: "Master's",
    intake_target: 'July 2026',
    priority: 'medium',
    current_status: 'New',
    source: 'website',
    notes: 'Fresh inquiry for Master of Information Technology at Monash or UNSW.',
  },

  // --- MYSURU ---
  {
    name: 'Darshan Wadeyar',
    phone_number: '+91 98220 11001',
    email: 'darshan.w@gmail.com',
    branch: BRANCHES.MYSURU,
    destination_country: 'United Kingdom',
    study_level: "Master's",
    intake_target: 'Fall 2026',
    priority: 'high',
    current_status: 'Deal Closed',
    source: 'walk_in',
    notes: 'Admissions consulting package finalized! Applications submitted to University of Edinburgh.',
  },
  {
    name: 'Shruthi Prasad',
    phone_number: '+91 98220 22002',
    email: 'shruthi.prasad@gmail.com',
    branch: BRANCHES.MYSURU,
    destination_country: 'Ireland',
    study_level: "Master's",
    intake_target: 'Fall 2026',
    priority: 'high',
    current_status: 'Assigned',
    source: 'website',
    notes: 'B.Pharm graduate from JSS Mysuru seeking MSc Pharmacology at NUI Galway.',
  },
  {
    name: 'Girish Urs',
    phone_number: '+91 98220 33003',
    email: 'girish.urs@yahoo.com',
    branch: BRANCHES.MYSURU,
    destination_country: 'United States',
    study_level: "Master's",
    intake_target: 'Fall 2026',
    priority: 'medium',
    current_status: 'Follow Up',
    follow_up_date: new Date(Date.now() - 86400000), // Overdue
    follow_up_time: '02:30 PM',
    source: 'referral',
    notes: 'Overdue follow up: Call student to discuss bank solvency certificate and I-20 financial requirements.',
  },
  {
    name: 'Aishwarya Deshpande',
    phone_number: '+91 98220 44004',
    email: 'aishwarya.d@gmail.com',
    branch: BRANCHES.MYSURU,
    destination_country: 'Canada',
    study_level: "Master's",
    intake_target: 'Fall 2026',
    priority: 'low',
    current_status: 'Not Interested',
    source: 'google_sheet',
    notes: 'Decided to continue current software engineering position at Infosys Mysuru for another year.',
  },
  {
    name: 'Vinayak Shastry',
    phone_number: '+91 98220 55005',
    email: 'vinayak.shastry@gmail.com',
    branch: BRANCHES.MYSURU,
    destination_country: 'Australia',
    study_level: 'MBA',
    intake_target: 'November 2026',
    priority: 'high',
    current_status: 'Confirm Visitor',
    source: 'walk_in',
    notes: 'Confirmed in-person appointment for profile evaluation this Saturday at Mysuru branch.',
  },

  // --- BELAGAVI ---
  {
    name: 'Sneha Belagavi',
    phone_number: '+91 98810 11001',
    email: 'sneha.b@gmail.com',
    branch: BRANCHES.BELAGAVI,
    destination_country: 'United Kingdom',
    study_level: 'MBA',
    intake_target: 'Fall 2026',
    priority: 'high',
    current_status: 'Visited',
    source: 'walk_in',
    notes: 'Visited Belagavi office with parents. Discussed 1-year MBA programs at Warwick and Cranfield.',
  },
  {
    name: 'Akash Patil',
    phone_number: '+91 98810 22002',
    email: 'akash.patil@outlook.com',
    branch: BRANCHES.BELAGAVI,
    destination_country: 'Australia',
    study_level: "Master's",
    intake_target: 'July 2026',
    priority: 'medium',
    current_status: 'Follow Up',
    follow_up_date: new Date(), // Today
    follow_up_time: '04:00 PM',
    source: 'manual',
    notes: "Today's follow-up: Needs clarification on Australian post-study work rights and regional migration points.",
  },
  {
    name: 'Prathiksha Joshi',
    phone_number: '+91 98810 33003',
    email: 'prathiksha.j@gmail.com',
    branch: BRANCHES.BELAGAVI,
    destination_country: 'United States',
    study_level: "Bachelor's",
    intake_target: 'Fall 2026',
    priority: 'medium',
    current_status: 'Confirm Visitor',
    source: 'meta_ads',
    notes: '12th standard student. Confirmed appointment to visit Belagavi office tomorrow at 2:00 PM with father.',
  },
  {
    name: 'Vinay Kulkarni',
    phone_number: '+91 98810 44004',
    email: 'vinay.kulkarni@gmail.com',
    branch: BRANCHES.BELAGAVI,
    destination_country: 'Germany',
    study_level: "Master's",
    intake_target: 'Winter 2026',
    priority: 'low',
    current_status: 'No Answer',
    total_call_attempts: 3,
    source: 'website',
    notes: 'Called three times on consecutive days with no response. WhatsApp introductory overview sent.',
  },
  {
    name: 'Aniket Deshmukh',
    phone_number: '+91 98810 55005',
    email: 'aniket.d@gmail.com',
    branch: BRANCHES.BELAGAVI,
    destination_country: 'United Kingdom',
    study_level: "Master's",
    intake_target: 'Fall 2026',
    priority: 'high',
    current_status: 'Interested',
    source: 'referral',
    notes: 'Civil engineer from KLS GIT Belagavi. Looking for MSc Structural Engineering in London.',
  },
];

/**
 * Idempotently seeds demo staff accounts, employees, leads, pipeline candidates,
 * student 360 profiles, and document vault entries across Bengaluru HQ, Mysuru, and Belagavi.
 */
async function seedDummyData() {
  console.log('='.repeat(65));
  console.log('🌱 Starting Aeterna One CRM Multi-Branch Dummy Data Seeding...');
  console.log('='.repeat(65));

  // 1. Seed Demo Staff (User Accounts)
  let staffCreated = 0;
  let staffUpdated = 0;
  for (const staff of DEMO_STAFF) {
    const existing = await User.findOne({ email: staff.email.toLowerCase() });
    if (!existing) {
      await User.create(staff);
      staffCreated++;
    } else {
      existing.name = staff.name;
      existing.role = staff.role;
      existing.branch = staff.branch;
      existing.isActive = true;
      await existing.save({ validateBeforeSave: false });
      staffUpdated++;
    }
  }
  console.log(`✓ Staff Accounts: ${staffCreated} created, ${staffUpdated} synchronized.`);

  // 2. Seed Staff Employees (Directory & Archived Vault)
  let employeesCreated = 0;
  let employeesUpdated = 0;
  for (const empData of DUMMY_EMPLOYEES_DATA) {
    const linkedUser = await User.findOne({ email: empData.email.toLowerCase() });
    const existing = await Employee.findOne({ employee_code: empData.employee_code });
    if (!existing) {
      await Employee.create({
        ...empData,
        user_id: linkedUser ? linkedUser._id : null,
      });
      employeesCreated++;
    } else {
      Object.assign(existing, empData);
      existing.user_id = linkedUser ? linkedUser._id : existing.user_id;
      await existing.save();
      employeesUpdated++;
    }
  }
  console.log(`✓ Staff Employees: ${employeesCreated} created, ${employeesUpdated} synchronized.`);

  // 3. Seed Lead Inquiries (Lead Management Hub)
  let leadsCreated = 0;
  let leadsUpdated = 0;
  const superAdmin = await User.findOne({ role: ROLES.SUPER_ADMIN });
  const blrCounsellor = await User.findOne({ email: 'counsellor.bengaluru@aeterna.com' });
  const mysCounsellor = await User.findOne({ email: 'counsellor.mysuru@aeterna.com' });
  const bgmCounsellor = await User.findOne({ email: 'counsellor.belagavi@aeterna.com' });

  for (const leadData of DUMMY_LEADS_DATA) {
    let assignedCounsellor = null;
    if (leadData.branch === BRANCHES.MYSURU) {
      assignedCounsellor = mysCounsellor;
    } else if (leadData.branch === BRANCHES.BELAGAVI) {
      assignedCounsellor = bgmCounsellor;
    } else {
      assignedCounsellor = blrCounsellor;
    }

    const existing = await Lead.findOne({ phone_number: leadData.phone_number });
    if (!existing) {
      await Lead.create({
        ...leadData,
        assigned_to: leadData.current_status !== 'New' ? assignedCounsellor?._id : null,
        assigned_by: leadData.current_status !== 'New' ? superAdmin?._id : null,
        assigned_at: leadData.current_status !== 'New' ? new Date() : null,
        created_by: superAdmin?._id || null,
      });
      leadsCreated++;
    } else {
      Object.assign(existing, leadData);
      if (leadData.current_status !== 'New' && !existing.assigned_to) {
        existing.assigned_to = assignedCounsellor?._id;
        existing.assigned_by = superAdmin?._id;
        existing.assigned_at = new Date();
      }
      await existing.save();
      leadsUpdated++;
    }
  }
  console.log(`✓ Lead Inquiries: ${leadsCreated} created, ${leadsUpdated} synchronized.`);

  // 4. Seed Admissions Pipeline Candidates
  let pipelineCreated = 0;
  let pipelineUpdated = 0;
  for (const candidate of DUMMY_PIPELINE_DATA) {
    const existing = await PipelineStudent.findOne({ email: candidate.email.toLowerCase() });
    if (!existing) {
      await PipelineStudent.create(candidate);
      pipelineCreated++;
    } else {
      existing.studentName = candidate.studentName;
      existing.phone = candidate.phone;
      existing.programme = candidate.programme;
      existing.university = candidate.university;
      existing.destination = candidate.destination;
      existing.intake = candidate.intake;
      existing.branch = candidate.branch;
      existing.stage = candidate.stage;
      existing.documentsVerified = candidate.documentsVerified;
      existing.sopStatus = candidate.sopStatus;
      existing.notes = candidate.notes;
      existing.counsellorName = candidate.counsellorName;
      await existing.save();
      pipelineUpdated++;
    }
  }
  console.log(`✓ Pipeline Candidates: ${pipelineCreated} created, ${pipelineUpdated} synchronized.`);

  // 5. Seed Student 360° Profiles
  let studentsCreated = 0;
  let studentsUpdated = 0;
  const createdStudentDocs = [];

  for (const profile of DUMMY_STUDENT_PROFILES) {
    const existing = await Student.findOne({ email: profile.email.toLowerCase() });
    if (!existing) {
      const doc = await Student.create(profile);
      createdStudentDocs.push(doc);
      studentsCreated++;
    } else {
      existing.studentName = profile.studentName;
      existing.phone = profile.phone;
      existing.branch = profile.branch;
      existing.status = profile.status;
      existing.identity = profile.identity;
      existing.academics = profile.academics;
      existing.testScores = profile.testScores;
      existing.financial = profile.financial;
      existing.preferences = profile.preferences;
      existing.applications = profile.applications;
      existing.notes = profile.notes;
      await existing.save();
      createdStudentDocs.push(existing);
      studentsUpdated++;
    }
  }
  console.log(`✓ Student 360 Profiles: ${studentsCreated} created, ${studentsUpdated} synchronized.`);

  // 6. Seed Document Vault Records for 360 Students
  let documentsCreated = 0;
  for (const studentDoc of createdStudentDocs) {
    const sampleDocuments = [
      {
        category: 'academic_transcripts',
        title: 'Class 10th CBSE Marksheet',
        fileName: `${studentDoc.studentId}_10th_marksheet.pdf`,
        fileSize: 1048576,
        mimeType: 'application/pdf',
        isVerified: true,
      },
      {
        category: 'academic_transcripts',
        title: 'Class 12th Board Certificate',
        fileName: `${studentDoc.studentId}_12th_marksheet.pdf`,
        fileSize: 1258291,
        mimeType: 'application/pdf',
        isVerified: true,
      },
      {
        category: 'academic_transcripts',
        title: 'Bachelors Degree Transcript',
        fileName: `${studentDoc.studentId}_bachelors_transcript.pdf`,
        fileSize: 2097152,
        mimeType: 'application/pdf',
        isVerified: true,
      },
      {
        category: 'passport_identity',
        title: 'Passport Copy (Front & Back)',
        fileName: `${studentDoc.studentId}_passport.pdf`,
        fileSize: 845200,
        mimeType: 'application/pdf',
        isVerified: true,
      },
      {
        category: 'test_score_cards',
        title: 'Official IELTS / Standardized Test TRF',
        fileName: `${studentDoc.studentId}_test_report.pdf`,
        fileSize: 654321,
        mimeType: 'application/pdf',
        isVerified: true,
      },
      {
        category: 'sop_lor',
        title: 'Statement of Purpose (Final Signed Draft)',
        fileName: `${studentDoc.studentId}_sop.pdf`,
        fileSize: 345678,
        mimeType: 'application/pdf',
        isVerified: false,
      },
      {
        category: 'financial_affidavits',
        title: 'Bank Solvency Letter & Proof of Funds',
        fileName: `${studentDoc.studentId}_bank_statement.pdf`,
        fileSize: 1892011,
        mimeType: 'application/pdf',
        isVerified: false,
      },
    ];

    for (const docSpec of sampleDocuments) {
      const existingDoc = await Document.findOne({
        student: studentDoc._id,
        title: docSpec.title,
      });

      if (!existingDoc) {
        await Document.create({
          student: studentDoc._id,
          studentIdCode: studentDoc.studentId,
          branch: studentDoc.branch,
          category: docSpec.category,
          title: docSpec.title,
          fileName: docSpec.fileName,
          fileSize: docSpec.fileSize,
          mimeType: docSpec.mimeType,
          storageKey: `vault/${studentDoc.branch}/${studentDoc._id}/${docSpec.category}/${docSpec.fileName}`,
          storageProvider: 'local',
          isVerified: docSpec.isVerified,
          verifiedByName: docSpec.isVerified ? 'Ananya Rao' : null,
          verifiedAt: docSpec.isVerified ? new Date() : null,
        });
        documentsCreated++;
      }
    }
  }
  console.log(`✓ Document Vault Records: ${documentsCreated} sample documents seeded.`);

  console.log('='.repeat(65));
  console.log('🎉 Seeding Completed Successfully Across All 3 Operating Branches!');
  console.log('='.repeat(65));

  return {
    staffCount: DEMO_STAFF.length,
    employeesCount: DUMMY_EMPLOYEES_DATA.length,
    leadsCount: DUMMY_LEADS_DATA.length,
    pipelineCount: DUMMY_PIPELINE_DATA.length,
    studentsCount: DUMMY_STUDENT_PROFILES.length,
    documentsCreated,
  };
}

// Standalone execution
if (require.main === module) {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aeterna_one_crm';
  console.log(`Connecting to MongoDB at: ${mongoUri}`);

  mongoose
    .connect(mongoUri, { serverSelectionTimeoutMS: 5000 })
    .then(async () => {
      await seedDummyData();
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error(`MongoDB connection/seeding failure: ${err.message}`);
      process.exit(1);
    });
}

module.exports = {
  seedDummyData,
  DEMO_STAFF,
  DUMMY_EMPLOYEES_DATA,
  DUMMY_LEADS_DATA,
  DUMMY_PIPELINE_DATA,
  DUMMY_STUDENT_PROFILES,
};
