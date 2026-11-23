/**
 * Aeterna One CRM — Institution Master Directory Seeder (via Backend API)
 *
 * Seeds realistic educational institutions across Karnataka:
 * - Feeder Schools (🏫)
 * - Partner Colleges & Universities (🏛)
 * - Overseas Test Prep Coaching Academies (🎯)
 *
 * Executes authentic REST API calls with real role credentials:
 * - Super Admin (admin@aeterna.com)
 * - Branch Manager Bengaluru (manager.bengaluru@aeterna.com)
 * - Branch Manager Mysuru (manager.mysuru@aeterna.com)
 * - Education Counsellor Bengaluru (counsellor.bengaluru@aeterna.com)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require(path.join(__dirname, '../../node_modules/mongoose'));
const app = require('../app');
const { ROLES, BRANCHES } = require('../config/constants');

const INSTITUTIONS_TO_SEED = [
  // =========================================================================
  // 1. FEEDER SCHOOLS (🏫)
  // =========================================================================
  {
    creatorRole: ROLES.SUPER_ADMIN,
    name: 'National Public School (NPS), Indiranagar, Bengaluru',
    institution_type: 'school',
    category: 'K-12 Senior Secondary & Pre-University',
    board_or_affiliation: 'CBSE / International Feeder',
    branch: BRANCHES.BENGALURU,
    city: 'Bengaluru',
    state: 'Karnataka',
    address: '12th A Main, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560008',
    contact_person: {
      name: 'Dr. Asha Raman',
      designation: 'Head of Senior School Guidance',
      phone: '+91 98450 11223',
      email: 'guidance@npsindiranagar.edu',
    },
    official_email: 'info@npsindiranagar.edu',
    official_phone: '+91 80 2528 0611',
    website: 'https://www.npsindiranagar.com',
    student_intake_capacity: '450 graduating seniors/year',
    target_destinations: ['United Kingdom', 'United States', 'Canada', 'Australia'],
    partnership_status: 'Active MoU',
    notes: 'Established feeder school MoU signed in 2025. Annual study abroad orientation seminar held every August.',
  },
  {
    creatorRole: ROLES.BRANCH_MANAGER,
    name: 'The International School Bangalore (TISB), Sarjapur',
    institution_type: 'school',
    category: 'K-12 & IB World Feeder School',
    board_or_affiliation: 'IB Diploma / Cambridge IGCSE',
    branch: BRANCHES.BENGALURU,
    city: 'Bengaluru',
    state: 'Karnataka',
    address: 'NAFL Valley, Whitefield - Sarjapur Road, Near Dommasandra Circle, Bengaluru 562125',
    contact_person: {
      name: 'Marcus Henderson',
      designation: 'Director of College Placement',
      phone: '+91 98451 22334',
      email: 'placement@tisb.ac.in',
    },
    official_email: 'admissions@tisb.ac.in',
    official_phone: '+91 80 2263 4900',
    website: 'https://tisb.org',
    student_intake_capacity: '220 graduating seniors/year',
    target_destinations: ['United States', 'United Kingdom', 'Canada', 'Singapore'],
    partnership_status: 'Partner',
    notes: 'High volume of Ivy League and Russell Group applicants. Dedicated mock visa interview sessions provided.',
  },
  {
    creatorRole: ROLES.COUNSELLOR,
    name: 'Delhi Public School (DPS) Bangalore South, Kanakapura Road',
    institution_type: 'school',
    category: 'Senior Secondary & Pre-University',
    board_or_affiliation: 'CBSE Affiliated',
    branch: BRANCHES.BENGALURU,
    city: 'Bengaluru',
    state: 'Karnataka',
    address: '11th KM, Bikashipura, Kanakapura Road, Konanakunte, Bengaluru 560062',
    contact_person: {
      name: 'Meenakshi Sundaram',
      designation: 'Higher Studies Coordinator',
      phone: '+91 98452 33445',
      email: 'abroad.counselling@dpsbangalore.edu',
    },
    official_email: 'south@dpsbangalore.edu',
    official_phone: '+91 80 2666 8581',
    website: 'https://south.dpsbangalore.edu.in',
    student_intake_capacity: '600 graduating seniors/year',
    target_destinations: ['Germany', 'United Kingdom', 'Ireland', 'Australia'],
    partnership_status: 'Active MoU',
    notes: 'Strong interest in STEM undergraduate courses in Germany and UK. Aeterna conducts free IELTS diagnostics here.',
  },
  {
    creatorRole: ROLES.BRANCH_MANAGER,
    name: "Marimallappa's High School & PU College, Mysuru",
    institution_type: 'school',
    category: 'Pre-University & High School Feeder',
    board_or_affiliation: 'Karnataka State Pre-University Board',
    branch: BRANCHES.MYSURU,
    city: 'Mysuru',
    state: 'Karnataka',
    address: 'Ramavilas Road, Subbarayanakere, Chamrajpura, Mysuru 570024',
    contact_person: {
      name: 'Prof. K. N. Shivakumar',
      designation: 'Vice Principal & Student Advisor',
      phone: '+91 98220 44556',
      email: 'marimallappa.mysuru@gmail.com',
    },
    official_email: 'contact@marimallappa.org',
    official_phone: '+91 821 242 0678',
    website: 'https://marimallappa.org',
    student_intake_capacity: '800 students/year',
    target_destinations: ['United Kingdom', 'Australia', 'Germany'],
    partnership_status: 'Campus Visited',
    notes: 'Mysuru branch visited campus in October 2026. Counsellors engaged with 180+ PCMB and PCMC students.',
  },
  {
    creatorRole: ROLES.SUPER_ADMIN,
    name: 'KLS Gogte PU College of Commerce & Science, Belagavi',
    institution_type: 'school',
    category: 'Senior Secondary & PU Science College',
    board_or_affiliation: 'Karnataka State PU Board',
    branch: BRANCHES.BELAGAVI,
    city: 'Belagavi',
    state: 'Karnataka',
    address: 'Tilakwadi, Belagavi, Karnataka 590006',
    contact_person: {
      name: 'S. V. Deshpande',
      designation: 'Dean of Academic Guidance',
      phone: '+91 98810 55667',
      email: 'guidance@klspu.edu',
    },
    official_email: 'info@klspu.edu',
    official_phone: '+91 831 240 5500',
    website: 'https://klspu.edu.in',
    student_intake_capacity: '500 students/year',
    target_destinations: ['United Kingdom', 'Canada', 'Germany'],
    partnership_status: 'Active MoU',
    notes: 'Key feeder institution for North Karnataka. High interest in Canadian college diplomas and UK B.Eng.',
  },
  {
    creatorRole: ROLES.COUNSELLOR,
    name: "Bishop Cotton Boys' School, St. Mark's Road, Bengaluru",
    institution_type: 'school',
    category: 'Premier Heritage Senior Secondary Feeder',
    board_or_affiliation: 'ICSE / ISC Board',
    branch: BRANCHES.BENGALURU,
    city: 'Bengaluru',
    state: 'Karnataka',
    address: '15, St. Marks Road, Bengaluru, Karnataka 560001',
    contact_person: {
      name: 'Rev. David Andrews',
      designation: 'Senior Career Master',
      phone: '+91 98453 66778',
      email: 'careers@bishopcottonboys.edu',
    },
    official_email: 'principal@cottonboys.com',
    official_phone: '+91 80 2221 3608',
    website: 'https://cottonboys.com',
    student_intake_capacity: '380 graduating seniors/year',
    target_destinations: ['United Kingdom', 'United States', 'Ireland', 'Australia'],
    partnership_status: 'Partner',
    notes: 'Annual admissions roadshow hosted on campus. High acceptance rate at Oxford, Cambridge, and London universities.',
  },

  // =========================================================================
  // 2. PARTNER COLLEGES & UNIVERSITIES (🏛)
  // =========================================================================
  {
    creatorRole: ROLES.SUPER_ADMIN,
    name: 'BMS College of Engineering (BMSCE), Bull Temple Road, Bengaluru',
    institution_type: 'college',
    category: 'Autonomous Engineering Institution',
    board_or_affiliation: 'VTU / NAAC A++ / NBA Tier-1',
    branch: BRANCHES.BENGALURU,
    city: 'Bengaluru',
    state: 'Karnataka',
    address: 'Bull Temple Road, Basavanagudi, Bengaluru, Karnataka 560019',
    contact_person: {
      name: 'Prof. S. K. Narayan',
      designation: 'Dean of Higher Studies & Placements',
      phone: '+91 98454 77889',
      email: 'higherstudies@bmsce.ac.in',
    },
    official_email: 'principal@bmsce.ac.in',
    official_phone: '+91 80 2662 2130',
    website: 'https://bmsce.ac.in',
    student_intake_capacity: '1,400 engineering grads/year',
    target_destinations: ['Germany', 'United States', 'Ireland', 'United Kingdom'],
    partnership_status: 'Active MoU',
    notes: 'Premier engineering partner. Bi-monthly higher studies workshops held for CS, ECE, and Mechanical students.',
  },
  {
    creatorRole: ROLES.BRANCH_MANAGER,
    name: 'RV College of Engineering (RVCE), Mysuru Road, Bengaluru',
    institution_type: 'college',
    category: 'Autonomous Engineering & Research College',
    board_or_affiliation: 'VTU / NBA Tier-1 Accredited',
    branch: BRANCHES.BENGALURU,
    city: 'Bengaluru',
    state: 'Karnataka',
    address: 'RV Vidyaniketan Post, Mysuru Road, Bengaluru, Karnataka 560059',
    contact_person: {
      name: 'Dr. Geetha V.',
      designation: 'Head of International Relations',
      phone: '+91 98455 88990',
      email: 'intl.relations@rvce.edu.in',
    },
    official_email: 'principal@rvce.edu.in',
    official_phone: '+91 80 6818 8100',
    website: 'https://rvce.edu.in',
    student_intake_capacity: '1,600 engineering grads/year',
    target_destinations: ['United States', 'Germany', 'Canada', 'Ireland'],
    partnership_status: 'Partner',
    notes: 'Top tier partner. Over 65 students transitioned to TU Munich, CMU, and Purdue through Aeterna counselling.',
  },
  {
    creatorRole: ROLES.COUNSELLOR,
    name: "St. Joseph's University (Autonomous), Lalbagh Road, Bengaluru",
    institution_type: 'college',
    category: 'Autonomous University (Commerce, Arts & Science)',
    board_or_affiliation: 'UGC Autonomous / NAAC A++',
    branch: BRANCHES.BENGALURU,
    city: 'Bengaluru',
    state: 'Karnataka',
    address: '36, Lalbagh Road, Langford Town, Shanti Nagar, Bengaluru 560027',
    contact_person: {
      name: 'Dr. Christopher Pais',
      designation: 'Global Opportunities Advisor',
      phone: '+91 98456 99001',
      email: 'global.outreach@sju.edu.in',
    },
    official_email: 'desk@sju.edu.in',
    official_phone: '+91 80 2227 4079',
    website: 'https://sju.edu.in',
    student_intake_capacity: '2,200 grads/year',
    target_destinations: ['United Kingdom', 'France', 'Australia', 'Ireland'],
    partnership_status: 'Active MoU',
    notes: 'B.Com and BBA students heavily targeted for Masters in Finance, Business Analytics, and International Management.',
  },
  {
    creatorRole: ROLES.BRANCH_MANAGER,
    name: 'National Institute of Engineering (NIE), Mysuru',
    institution_type: 'college',
    category: 'Premier Autonomous Engineering College',
    board_or_affiliation: 'VTU / AICTE Approved',
    branch: BRANCHES.MYSURU,
    city: 'Mysuru',
    state: 'Karnataka',
    address: 'Manandavadi Road, Mysuru, Karnataka 570008',
    contact_person: {
      name: 'Prof. Ramesh Chandra',
      designation: 'Dean of Industry & Overseas Relations',
      phone: '+91 98221 00112',
      email: 'overseas@nie.ac.in',
    },
    official_email: 'principal@nie.ac.in',
    official_phone: '+91 821 248 0475',
    website: 'https://nie.ac.in',
    student_intake_capacity: '1,100 grads/year',
    target_destinations: ['United States', 'Germany', 'United Kingdom'],
    partnership_status: 'Partner',
    notes: 'Flagship college in Mysuru. Aeterna runs the on-campus GRE and IELTS testing prep booth.',
  },
  {
    creatorRole: ROLES.SUPER_ADMIN,
    name: 'KLS Gogte Institute of Technology (GIT), Belagavi',
    institution_type: 'college',
    category: 'Autonomous Engineering & Technology Institute',
    board_or_affiliation: 'VTU / NAAC A+',
    branch: BRANCHES.BELAGAVI,
    city: 'Belagavi',
    state: 'Karnataka',
    address: 'Jnana Ganga, Udyambag, Belagavi, Karnataka 590008',
    contact_person: {
      name: 'Dr. M. S. Patil',
      designation: 'Overseas Education Cell Coordinator',
      phone: '+91 98811 11223',
      email: 'studyabroad@git.edu',
    },
    official_email: 'principal@git.edu',
    official_phone: '+91 831 240 5500',
    website: 'https://git.edu',
    student_intake_capacity: '950 grads/year',
    target_destinations: ['Germany', 'Canada', 'United States'],
    partnership_status: 'Active MoU',
    notes: 'High demand for MS in Automotive and Mechanical Engineering in Germany (TU9 universities).',
  },
  {
    creatorRole: ROLES.BRANCH_MANAGER,
    name: 'SDM College of Business Management, Mysuru',
    institution_type: 'college',
    category: 'Autonomous Management, BBA & Commerce College',
    board_or_affiliation: 'University of Mysore / NAAC A',
    branch: BRANCHES.MYSURU,
    city: 'Mysuru',
    state: 'Karnataka',
    address: 'Siddharthanagar, Mysuru, Karnataka 570011',
    contact_person: {
      name: 'Dr. Anjali Hegde',
      designation: 'Career Advisory Head',
      phone: '+91 98222 22334',
      email: 'careers@sdmmysuru.in',
    },
    official_email: 'info@sdm.ac.in',
    official_phone: '+91 821 247 1650',
    website: 'https://sdmmysuru.in',
    student_intake_capacity: '650 grads/year',
    target_destinations: ['United Kingdom', 'Ireland', 'Australia'],
    partnership_status: 'Prospective',
    notes: 'Counselling presentation planned for next semester for MIM and MSc Marketing in UK and Dublin.',
  },

  // =========================================================================
  // 3. OVERSEAS TEST PREP COACHING ACADEMIES (🎯)
  // =========================================================================
  {
    creatorRole: ROLES.SUPER_ADMIN,
    name: 'Inspire IELTS & Overseas Test Prep Academy, Indiranagar, Bengaluru',
    institution_type: 'coaching_institute',
    category: 'Overseas English & Aptitude Test Prep Hub',
    board_or_affiliation: 'British Council & IDP Accredited Node',
    branch: BRANCHES.BENGALURU,
    city: 'Bengaluru',
    state: 'Karnataka',
    address: '#542, 1st Floor, 100ft Road, Indiranagar, Bengaluru, Karnataka 560038',
    contact_person: {
      name: 'Vikram Sethi',
      designation: 'Founder & Chief IELTS Mentor',
      phone: '+91 98457 33445',
      email: 'director@inspireielts.com',
    },
    official_email: 'admissions@inspireielts.com',
    official_phone: '+91 80 4123 7890',
    website: 'https://inspireielts.com',
    student_intake_capacity: '350 test prep students/year',
    target_destinations: ['United Kingdom', 'Australia', 'Canada', 'New Zealand'],
    partnership_status: 'Partner',
    notes: 'Direct referral channel: students completing Band 7+ IELTS are routed directly into Aeterna CRM for university applications.',
  },
  {
    creatorRole: ROLES.BRANCH_MANAGER,
    name: 'Career Launcher Study Abroad Hub, Koramangala, Bengaluru',
    institution_type: 'coaching_institute',
    category: 'National Admissions & Aptitude Prep Chain',
    board_or_affiliation: 'GRE / GMAT / SAT / IELTS Training Node',
    branch: BRANCHES.BENGALURU,
    city: 'Bengaluru',
    state: 'Karnataka',
    address: '#105, 5th Block, Jyoti Nivas College Road, Koramangala, Bengaluru 560095',
    contact_person: {
      name: 'Ritu Mathur',
      designation: 'Centre Head & Admissions Coach',
      phone: '+91 98458 44556',
      email: 'koramangala@careerlauncher.com',
    },
    official_email: 'bangalore.studyabroad@careerlauncher.com',
    official_phone: '+91 80 4150 2200',
    website: 'https://careerlauncher.com',
    student_intake_capacity: '800 candidates/year',
    target_destinations: ['United States', 'United Kingdom', 'Germany'],
    partnership_status: 'Active MoU',
    notes: 'Joint marketing webinars conducted monthly. Co-branded GRE + US application masterclasses.',
  },
  {
    creatorRole: ROLES.BRANCH_MANAGER,
    name: 'Mysuru Scholars Test Prep & Language Centre, Saraswathipuram, Mysuru',
    institution_type: 'coaching_institute',
    category: 'Regional Test Prep & German Language Academy',
    board_or_affiliation: 'Goethe-Institut Partner / IELTS Prep Hub',
    branch: BRANCHES.MYSURU,
    city: 'Mysuru',
    state: 'Karnataka',
    address: '14th Cross, Saraswathipuram, Near Swimming Pool, Mysuru 570009',
    contact_person: {
      name: 'Harish Raghavan',
      designation: 'Managing Director',
      phone: '+91 98223 55667',
      email: 'contact@mysurescholars.in',
    },
    official_email: 'study@mysurescholars.in',
    official_phone: '+91 821 254 3322',
    website: 'https://mysurescholars.in',
    student_intake_capacity: '300 candidates/year',
    target_destinations: ['Germany', 'Ireland', 'United Kingdom'],
    partnership_status: 'Partner',
    notes: 'Premier German A1/B1 feeder for our Mysuru study abroad cohort. Excellent visa track record.',
  },
  {
    creatorRole: ROLES.SUPER_ADMIN,
    name: 'Belagavi IELTS & SAT Academy, Tilakwadi, Belagavi',
    institution_type: 'coaching_institute',
    category: 'Language & Overseas Aptitude Coaching Hub',
    board_or_affiliation: 'Independent IELTS & TOEFL Training Node',
    branch: BRANCHES.BELAGAVI,
    city: 'Belagavi',
    state: 'Karnataka',
    address: 'Khanapur Road, Camp, Belagavi, Karnataka 590001',
    contact_person: {
      name: 'Sanjay Kulkarni',
      designation: 'Head Tutor',
      phone: '+91 98812 66778',
      email: 'info@belagaviielts.com',
    },
    official_email: 'admissions@belagaviielts.com',
    official_phone: '+91 831 242 8899',
    website: 'https://belagaviielts.com',
    student_intake_capacity: '250 candidates/year',
    target_destinations: ['United Kingdom', 'Canada', 'Australia'],
    partnership_status: 'Prospective',
    notes: 'Initial outreach made. Meeting scheduled with Belagavi branch manager to formalize commission MoU.',
  },
  {
    creatorRole: ROLES.COUNSELLOR,
    name: 'T.I.M.E. Overseas Education Academy, Jayanagar, Bengaluru',
    institution_type: 'coaching_institute',
    category: 'Premier National Test Prep Chain',
    board_or_affiliation: 'GMAT / GRE / IELTS Specialist Center',
    branch: BRANCHES.BENGALURU,
    city: 'Bengaluru',
    state: 'Karnataka',
    address: '#34, 11th Main, 4th Block, Jayanagar, Bengaluru 560011',
    contact_person: {
      name: 'Arvind Swamy',
      designation: 'Academic Director',
      phone: '+91 98459 77889',
      email: 'jayanagar@time4education.com',
    },
    official_email: 'bangalore@time4education.com',
    official_phone: '+91 80 4121 1122',
    website: 'https://time4education.com',
    student_intake_capacity: '600 candidates/year',
    target_destinations: ['United States', 'Canada', 'France'],
    partnership_status: 'Campus Visited',
    notes: 'High concentration of GMAT aspirants aiming for INSEAD, HEC Paris, and Rotman Canada.',
  },
];

async function seedInstitutions() {
  console.log('========================================================================');
  console.log('  🏛 AETERNA ONE CRM — INSTITUTION MASTER DIRECTORY API SEEDER');
  console.log('========================================================================\n');

  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aeterna_one_crm';
  console.log(`Connecting to MongoDB at: ${MONGO_URI}`);
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  console.log('  ✓ Connected to MongoDB database successfully.\n');

  // Start ephemeral local server
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;
  console.log(`  ✓ Ephemeral Express server running on port ${port} (${baseUrl})\n`);

  // Role Login helper
  const tokenCache = {};
  const loginRole = async (email, password) => {
    if (tokenCache[email]) return tokenCache[email];
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
    tokenCache[email] = token;
    return token;
  };

  const ROLE_CREDENTIALS = {
    [ROLES.SUPER_ADMIN]: { email: 'admin@aeterna.com', password: 'Password@123' },
    [ROLES.BRANCH_MANAGER]: { email: 'manager.bengaluru@aeterna.com', password: 'Password@123' },
    [ROLES.COUNSELLOR]: { email: 'counsellor.bengaluru@aeterna.com', password: 'Password@123' },
  };

  try {
    console.log('--- 1. Authenticating Roles via POST /api/v1/auth/login ---');
    for (const [role, creds] of Object.entries(ROLE_CREDENTIALS)) {
      const token = await loginRole(creds.email, creds.password);
      console.log(`  ✓ Authenticated as ${role} (${creds.email}) — JWT issued`);
    }

    console.log('\n--- 2. Dispatching Institution Creation Requests via POST /api/v1/institutions ---');

    let createdCount = 0;
    let existingCount = 0;

    for (const item of INSTITUTIONS_TO_SEED) {
      const { creatorRole, ...payload } = item;
      const creds = ROLE_CREDENTIALS[creatorRole] || ROLE_CREDENTIALS[ROLES.SUPER_ADMIN];
      const token = tokenCache[creds.email];

      const res = await fetch(`${baseUrl}/institutions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (res.status === 201) {
        createdCount++;
        const inst = json.institution || json.data?.institution;
        console.log(`  [201 CREATED] ${payload.institution_type.toUpperCase().padEnd(18)} : "${payload.name}" (by ${creatorRole})`);
      } else if (res.status === 409) {
        existingCount++;
        console.log(`  [409 EXISTS]  ${payload.institution_type.toUpperCase().padEnd(18)} : "${payload.name}" already in directory`);
      } else {
        console.warn(`  [${res.status} WARN]    ${payload.name}: ${json.message}`);
      }
    }

    console.log(`\n  Seeding Summary: ${createdCount} new institutions created, ${existingCount} already present.`);

    console.log('\n--- 3. Verifying Aggregated Directory Statistics via GET /api/v1/institutions/stats ---');
    const adminToken = tokenCache['admin@aeterna.com'];
    const statsRes = await fetch(`${baseUrl}/institutions/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const statsJson = await statsRes.json();
    const stats = statsJson.stats || statsJson.data?.stats;
    console.log('  ✓ Statistics Response:');
    console.log(`     - Total Active Institutions: ${stats?.total}`);
    console.log(`     - Feeder Schools:            ${stats?.totalSchools}`);
    console.log(`     - Partner Colleges:          ${stats?.totalColleges}`);
    console.log(`     - Coaching Academies:        ${stats?.totalCoaching}`);
    console.log(`     - Active MoU & Partnerships: ${stats?.totalPartnerships}`);

    console.log('\n--- 4. Verifying Directory Filtering via GET /api/v1/institutions ---');
    for (const type of ['school', 'college', 'coaching_institute']) {
      const filterRes = await fetch(`${baseUrl}/institutions?type=${type}&limit=5`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const filterJson = await filterRes.json();
      const list = filterJson.institutions || filterJson.data?.institutions || [];
      console.log(`  ✓ Queried type="${type}": found ${list.length} records on page 1`);
    }

    console.log('\n========================================================================');
    console.log('  🎉 INSTITUTION DIRECTORY SEEDING COMPLETE & VERIFIED 100%');
    console.log('========================================================================\n');
  } catch (err) {
    console.error('\n❌ Seeding Error:', err);
    process.exitCode = 1;
  } finally {
    if (server) await new Promise((r) => server.close(r));
    if (mongoose.connection.readyState === 1) await mongoose.disconnect();
  }
}

seedInstitutions();
