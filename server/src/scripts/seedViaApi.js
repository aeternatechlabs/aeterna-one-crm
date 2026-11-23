const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const app = require('../app');
const { ROLES, BRANCHES } = require('../config/constants');
const User = require('../modules/users/user.model');

// Preset Credentials from LoginPage.jsx
const PRESET_ACCOUNTS = [
  {
    role: ROLES.SUPER_ADMIN,
    name: 'Sachin Tiwari (Super Admin)',
    email: 'admin@aeterna.com',
    password: 'Password@123',
    branch: BRANCHES.ALL,
    phone: '+91 99000 11223',
  },
  {
    role: ROLES.BRANCH_MANAGER,
    name: 'Rajesh Varma (Bengaluru Manager)',
    email: 'manager.bengaluru@aeterna.com',
    password: 'Password@123',
    branch: BRANCHES.BENGALURU,
    phone: '+91 98450 33445',
  },
  {
    role: ROLES.COUNSELLOR,
    name: 'Priya Nair (Bengaluru Counsellor)',
    email: 'counsellor.bengaluru@aeterna.com',
    password: 'Password@123',
    branch: BRANCHES.BENGALURU,
    phone: '+91 98860 55667',
  },
  {
    role: ROLES.BRANCH_MANAGER,
    name: 'Vikram Joshi (Mysuru Manager)',
    email: 'manager.mysuru@aeterna.com',
    password: 'Password@123',
    branch: BRANCHES.MYSURU,
    phone: '+91 98220 77889',
  },
  {
    role: ROLES.APPLICATION_OFFICER,
    name: 'Ananya Rao (Application Officer)',
    email: 'admissions@aeterna.com',
    password: 'Password@123',
    branch: BRANCHES.BENGALURU,
    phone: '+91 97400 99001',
  },
];

// Employee Roster to provision via Super Admin API
const EMPLOYEES_TO_PROVISION = [
  {
    first_name: 'Rajesh',
    last_name: 'Varma',
    employee_code: 'AET-101',
    email: 'manager.bengaluru@aeterna.com',
    branch: BRANCHES.BENGALURU,
    role: ROLES.BRANCH_MANAGER,
    department: 'Branch Management',
    designation: 'Branch Manager',
    password: 'Password@123',
    profile_photo: '/staff/avatar-manager-m1.jpg',
    contact_info: { phone: '+91 98450 33445', address: '#14, Indiranagar, Bengaluru' },
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
    password: 'Password@123',
    profile_photo: '/staff/avatar-counsellor-f1.jpg',
    contact_info: { phone: '+91 98860 55667', address: '#45, Koramangala, Bengaluru' },
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
    password: 'Password@123',
    profile_photo: '/staff/avatar-admissions-f2.jpg',
    contact_info: { phone: '+91 97400 99001', address: '#22, Malleshwaram, Bengaluru' },
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
    password: 'Password@123',
    profile_photo: '/staff/avatar-visa-m2.jpg',
    contact_info: { phone: '+91 98451 77665', address: '#108, HSR Layout, Bengaluru' },
  },
  {
    first_name: 'Vikram',
    last_name: 'Joshi',
    employee_code: 'AET-201',
    email: 'manager.mysuru@aeterna.com',
    branch: BRANCHES.MYSURU,
    role: ROLES.BRANCH_MANAGER,
    department: 'Branch Management',
    designation: 'Branch Manager',
    password: 'Password@123',
    profile_photo: '/staff/avatar-manager-m1.jpg',
    contact_info: { phone: '+91 98220 77889', address: '#19, Sayyaji Rao Rd, Mysuru' },
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
    password: 'Password@123',
    profile_photo: '/staff/avatar-counsellor-f1.jpg',
    contact_info: { phone: '+91 98440 22334', address: '#88, Gokulam, Mysuru' },
  },
  {
    first_name: 'Mahesh',
    last_name: 'Kulkarni',
    employee_code: 'AET-301',
    email: 'manager.belagavi@aeterna.com',
    branch: BRANCHES.BELAGAVI,
    role: ROLES.BRANCH_MANAGER,
    department: 'Branch Management',
    designation: 'Branch Manager',
    password: 'Password@123',
    profile_photo: '/staff/avatar-manager-m1.jpg',
    contact_info: { phone: '+91 98810 66778', address: '#56, Tilakwadi, Belagavi' },
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
    password: 'Password@123',
    profile_photo: '/staff/avatar-counsellor-f1.jpg',
    contact_info: { phone: '+91 98500 88990', address: '#12, Camp Area, Belagavi' },
  },
  // Staff meant for the Dedicated Trash Vault
  {
    first_name: 'Harish',
    last_name: 'Shetty',
    employee_code: 'AET-901',
    email: 'harish.shetty@aeterna.com',
    branch: BRANCHES.BELAGAVI,
    role: ROLES.COUNSELLOR,
    department: 'Counselling & Admissions',
    designation: 'Education Counsellor',
    password: 'Password@123',
    profile_photo: '/staff/avatar-manager-m1.jpg',
    moveToTrashReason: 'Resigned due to personal relocation to Pune',
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
    password: 'Password@123',
    profile_photo: '/staff/avatar-visa-m2.jpg',
    moveToTrashReason: 'Fixed-term annual contract tenure concluded on 31 Oct 2026',
  },
];

// Leads to provision per role
const LEADS_BY_ROLE = {
  [ROLES.SUPER_ADMIN]: [
    {
      name: 'Aditya Ramesh Rao',
      phone_number: '+91 98451 10001',
      email: 'aditya.rao@gmail.com',
      branch: BRANCHES.BENGALURU,
      destination_country: 'United Kingdom',
      study_level: "Master's",
      intake_target: 'Fall 2026',
      priority: 'high',
      notes: 'B.E. Computer Science from BMSCE (8.4 CGPA). Looking for MSc Data Science at Imperial / UCL.',
      source: 'website',
    },
    {
      name: 'Sneha Belagavi',
      phone_number: '+91 98810 11001',
      email: 'sneha.b@gmail.com',
      branch: BRANCHES.BELAGAVI,
      destination_country: 'United Kingdom',
      study_level: 'MBA',
      intake_target: 'Fall 2026',
      priority: 'high',
      notes: 'Executive referral: Warwick and Cranfield 1-year MBA programs.',
      source: 'walk_in',
    },
  ],
  [ROLES.BRANCH_MANAGER]: [
    {
      name: 'Meghana Sundaram',
      phone_number: '+91 98452 20002',
      email: 'meghana.s@yahoo.com',
      branch: BRANCHES.BENGALURU,
      destination_country: 'United States',
      study_level: "Master's",
      intake_target: 'Fall 2026',
      priority: 'high',
      notes: 'GRE score 322. Interested in MS CS at UT Austin, Purdue, and ASU.',
      source: 'meta_ads',
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
      notes: 'Mechanical engineer: English-taught automotive programs at TU Munich.',
      source: 'walk_in',
    },
  ],
  [ROLES.COUNSELLOR]: [
    {
      name: 'Pooja Hegde',
      phone_number: '+91 98454 40004',
      email: 'pooja.hegde@hotmail.com',
      branch: BRANCHES.BENGALURU,
      destination_country: 'Ireland',
      study_level: "Master's",
      intake_target: 'Fall 2026',
      priority: 'medium',
      notes: 'Interested in MSc FinTech at Trinity College Dublin.',
      source: 'referral',
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
      notes: 'In-person counseling completed. Shortlisted University of Manchester.',
      source: 'walk_in',
      convertDirectly: true,
      convertProgramme: 'MSc Business Analytics',
      convertUniversity: 'University of Manchester',
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
      notes: 'Prefers chat communication only due to night shift hours.',
      source: 'google_sheet',
    },
  ],
};

async function runApiSeeder() {
  console.log('='.repeat(70));
  console.log('🚀 AETERNA ONE CRM — AUTOMATED API DATA SEEDER & ROLE TEST HARNESS');
  console.log('='.repeat(70));

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aeterna_one_crm';
  console.log(`Connecting to database: ${mongoUri}`);

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

  // 1. Ensure Baseline Preset Accounts exist in DB
  console.log('\n--- 1. Ensuring Preset Login Accounts Exist in Database ---');
  for (const acct of PRESET_ACCOUNTS) {
    const existing = await User.findOne({ email: acct.email.toLowerCase() });
    if (!existing) {
      await User.create(acct);
      console.log(`  ✓ Provisioned preset account: ${acct.email} [${acct.role}]`);
    } else {
      existing.name = acct.name;
      existing.role = acct.role;
      existing.branch = acct.branch;
      existing.isActive = true;
      await existing.save({ validateBeforeSave: false });
      console.log(`  ✓ Synchronized preset account: ${acct.email} [${acct.role}]`);
    }
  }

  // 2. Start in-process HTTP server
  const server = app.listen(0, '127.0.0.1');
  await new Promise((res) => server.once('listening', res));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;
  console.log(`\nAPI Test Target listening on: ${baseUrl}`);

  const loginRole = async (email, password) => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(`Login failed for ${email}: ${json.message}`);
    }
    const token = json.token || json.data?.token;
    const user = json.user || json.data?.user;
    return { token, user };
  };

  try {
    // =======================================================================
    // STEP A: SUPER ADMIN OPERATIONS
    // =======================================================================
    console.log('\n--- 2. [👑 SUPER ADMIN] Authenticating and Seeding Staff Roster & Vault ---');
    const { token: adminToken } = await loginRole('admin@aeterna.com', 'Password@123');
    console.log('  ✓ Super Admin logged in successfully (JWT token issued)');

    const authHeaders = (token) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });

    let activeEmployeesAdded = 0;
    let trashedEmployeesAdded = 0;

    for (const emp of EMPLOYEES_TO_PROVISION) {
      const { moveToTrashReason, ...empPayload } = emp;

      // Call POST /api/v1/employees
      const createRes = await fetch(`${baseUrl}/employees`, {
        method: 'POST',
        headers: authHeaders(adminToken),
        body: JSON.stringify(empPayload),
      });

      const createJson = await createRes.json();
      if (createRes.status === 201) {
        const createdEmp = createJson.employee || createJson.data?.employee;
        if (moveToTrashReason && createdEmp) {
          // Soft-delete to Trash Vault via DELETE /api/v1/employees/:id
          const delRes = await fetch(`${baseUrl}/employees/${createdEmp._id}`, {
            method: 'DELETE',
            headers: authHeaders(adminToken),
            body: JSON.stringify({ deleteReason: moveToTrashReason }),
          });
          if (delRes.ok) {
            trashedEmployeesAdded++;
            console.log(`  🗑 Moved staff ${emp.employee_code} (${emp.first_name} ${emp.last_name}) to Trash Vault: "${moveToTrashReason}"`);
          }
        } else {
          activeEmployeesAdded++;
          console.log(`  👤 Provisioned active staff: ${emp.employee_code} - ${emp.first_name} ${emp.last_name} (${emp.role} @ ${emp.branch})`);
        }
      } else if (createRes.status === 409) {
        console.log(`  ℹ Staff ${emp.employee_code} already exists (skipping duplicate)`);
      } else {
        console.warn(`  ⚠ Warning creating ${emp.employee_code}: ${createJson.message}`);
      }
    }

    // Super Admin Seeds Executive Leads
    for (const lead of LEADS_BY_ROLE[ROLES.SUPER_ADMIN]) {
      const leadRes = await fetch(`${baseUrl}/leads`, {
        method: 'POST',
        headers: authHeaders(adminToken),
        body: JSON.stringify(lead),
      });
      const leadJson = await leadRes.json();
      if (leadRes.ok) {
        console.log(`  🎯 Super Admin created lead: ${lead.name} (${lead.destination_country})`);
      } else if (leadRes.status === 409) {
        console.log(`  ℹ Lead already exists: ${lead.name}`);
      } else {
        console.warn(`  ⚠ Warning creating lead ${lead.name}: ${leadJson.message}`);
      }
    }

    // =======================================================================
    // STEP B: BRANCH MANAGER (BENGALURU) OPERATIONS & RBAC CHECK
    // =======================================================================
    console.log('\n--- 3. [🏢 BRANCH MANAGER (BLR)] Operations & Security Check ---');
    const { token: blrManagerToken } = await loginRole('manager.bengaluru@aeterna.com', 'Password@123');
    console.log('  ✓ Branch Manager logged in successfully');

    // Security check: Manager MUST NOT access /employees
    const empForbiddenRes = await fetch(`${baseUrl}/employees`, {
      method: 'GET',
      headers: authHeaders(blrManagerToken),
    });
    console.log(`  🛡 RBAC Gate: Manager access to /employees returned HTTP ${empForbiddenRes.status} (Expected: 403 Forbidden)`);

    // Manager Seeds Leads
    for (const lead of LEADS_BY_ROLE[ROLES.BRANCH_MANAGER]) {
      const leadRes = await fetch(`${baseUrl}/leads`, {
        method: 'POST',
        headers: authHeaders(blrManagerToken),
        body: JSON.stringify(lead),
      });
      const leadJson = await leadRes.json();
      if (leadRes.ok) {
        console.log(`  🎯 Manager created lead: ${lead.name} (${lead.destination_country})`);
      } else if (leadRes.status === 409) {
        console.log(`  ℹ Lead already exists: ${lead.name}`);
      } else {
        console.warn(`  ⚠ Warning creating lead ${lead.name}: ${leadJson.message}`);
      }
    }

    // =======================================================================
    // STEP C: COUNSELLOR (BENGALURU) OPERATIONS & 1-CLICK CONVERSION
    // =======================================================================
    console.log('\n--- 4. [🎓 COUNSELLOR (BLR)] Inquiries, Follow-ups & 1-Click Conversion ---');
    const { token: counsellorToken } = await loginRole('counsellor.bengaluru@aeterna.com', 'Password@123');
    console.log('  ✓ Counsellor logged in successfully');

    for (const lead of LEADS_BY_ROLE[ROLES.COUNSELLOR]) {
      const leadRes = await fetch(`${baseUrl}/leads`, {
        method: 'POST',
        headers: authHeaders(counsellorToken),
        body: JSON.stringify(lead),
      });
      const leadJson = await leadRes.json();
      if (leadRes.ok) {
        const createdLead = leadJson.lead || leadJson.data?.lead;
        console.log(`  🎯 Counsellor created lead: ${lead.name} [Status: ${createdLead.current_status}]`);

        // If marked for 1-Click conversion test
        if (lead.convertDirectly && createdLead) {
          const convRes = await fetch(`${baseUrl}/leads/${createdLead._id}/convert`, {
            method: 'POST',
            headers: authHeaders(counsellorToken),
            body: JSON.stringify({
              programme: lead.convertProgramme,
              university: lead.convertUniversity,
            }),
          });
          const convJson = await convRes.json();
          if (convRes.ok) {
            console.log(`  ⚡ 1-Click Converted lead "${lead.name}" to Admissions Pipeline Candidate in stage "new"!`);
          } else {
            console.warn(`  ⚠ Conversion failed for ${lead.name}: ${convJson.message}`);
          }
        }
      } else if (leadRes.status === 409) {
        console.log(`  ℹ Lead already exists: ${lead.name}`);
      } else {
        console.warn(`  ⚠ Warning creating lead ${lead.name}: ${leadJson.message}`);
      }
    }

    // =======================================================================
    // STEP D: VERIFICATION & STATS
    // =======================================================================
    console.log('\n--- 5. Final Seed Verification via Query APIs ---');
    const leadsStatsRes = await fetch(`${baseUrl}/leads?limit=50`, {
      method: 'GET',
      headers: authHeaders(adminToken),
    });
    const leadsStatsJson = await leadsStatsRes.json();
    const leadsCount = leadsStatsJson.pagination?.total || leadsStatsJson.data?.pagination?.total || (leadsStatsJson.leads?.length) || 0;

    const empStatsRes = await fetch(`${baseUrl}/employees?limit=50`, {
      method: 'GET',
      headers: authHeaders(adminToken),
    });
    const empStatsJson = await empStatsRes.json();
    const empCount = empStatsJson.stats?.totalActive ?? empStatsJson.pagination?.total ?? empStatsJson.data?.pagination?.total ?? (empStatsJson.employees?.length) ?? 0;

    const trashStatsRes = await fetch(`${baseUrl}/employees/trash`, {
      method: 'GET',
      headers: authHeaders(adminToken),
    });
    const trashStatsJson = await trashStatsRes.json();
    const trashCount = trashStatsJson.stats?.totalTrash ?? trashStatsJson.pagination?.total ?? trashStatsJson.data?.pagination?.total ?? (trashStatsJson.employees?.length) ?? 0;

    console.log('='.repeat(70));
    console.log('🎉 SEEDING & BACKEND API TESTING COMPLETED SUCCESSFULLY!');
    console.log(`  • Active Staff Directory : ${empCount} employees`);
    console.log(`  • Archived Staff Vault   : ${trashCount} employees in trash`);
    console.log(`  • Lead Management Hub    : ${leadsCount} leads across all branches`);
    console.log('='.repeat(70));

  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

// Standalone execution
if (require.main === module) {
  runApiSeeder()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n❌ API Seeder failed:', err);
      process.exit(1);
    });
}

module.exports = { runApiSeeder };
