/**
 * Day 32: Student Profile Model & Lead Conversion Architecture
 * Unit & Contract Verification Suite
 *
 * Verifies:
 * - 8 Core Student 360° Profile sections in Mongoose schema
 * - Required field validation, branch enum containment, and status enums
 * - Compound indexing and text search indexing
 * - Human-readable unique Student ID generator (AET-{BRANCH}-{YEAR}-{HASH})
 * - Lead conversion data mapping to 8 sections
 * - Immutable source attribution (originalLeadId, convertedBy, convertedAt, initialStage)
 * - Duplicate student prevention (already-converted leads and duplicate email in same branch)
 * - Branch containment and cross-branch conversion rejection
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const {
  BRANCHES,
  BRANCH_CODES,
  ROLES,
  STUDENT_STATUS,
  TEST_SCORE_TYPES,
  STUDENT_PROFILE_SECTIONS,
} = require('../src/config/constants');

const Student = require('../src/modules/students/student.model');
const {
  generateStudentId,
  convertLeadToStudent,
} = require('../src/modules/students/studentConversion.service');

describe('Day 32: Student 360° Model Architecture & Schema Verification', () => {
  test('B3.32.1: Student schema defines all 8 core profile sections', () => {
    const paths = Object.keys(Student.schema.paths);

    // Section 1: Detailed Identity & Contact (Tier 3 PII)
    assert.ok(paths.includes('identity.studentName'), 'identity.studentName path defined');
    assert.ok(paths.includes('identity.email'), 'identity.email path defined');
    assert.ok(paths.includes('identity.phone'), 'identity.phone path defined');
    assert.ok(paths.includes('identity.dob'), 'identity.dob path defined');
    assert.ok(paths.includes('identity.passport.passportNumber'), 'identity.passport path defined');
    assert.ok(paths.includes('identity.emergencyContact.name'), 'identity.emergencyContact path defined');

    // Section 2: Academic History (Tier 2)
    assert.ok(paths.includes('academics.highestQualification'), 'academics.highestQualification defined');
    assert.ok(paths.includes('academics.undergradCgpa'), 'academics.undergradCgpa defined');
    assert.ok(paths.includes('academics.activeBacklogs'), 'academics.activeBacklogs defined');

    // Section 3: Standardized Test Scores (Tier 2)
    assert.ok(Student.schema.paths['testScores.records'], 'testScores.records subdocument array defined');

    // Section 4: Budget & Financial Capability (Tier 4 Confidential Assets)
    assert.ok(paths.includes('financial.annualBudget'), 'financial.annualBudget defined');
    assert.ok(paths.includes('financial.fundingSource'), 'financial.fundingSource defined');
    assert.ok(paths.includes('financial.loanStatus'), 'financial.loanStatus defined');
    assert.ok(paths.includes('financial.sponsorDetails.annualIncome'), 'financial.sponsorDetails defined');

    // Section 5: Study Abroad Preferences (Tier 2)
    assert.ok(paths.includes('preferences.destinationCountries'), 'preferences.destinationCountries defined');
    assert.ok(paths.includes('preferences.targetDegreeLevel'), 'preferences.targetDegreeLevel defined');
    assert.ok(paths.includes('preferences.targetIntakes'), 'preferences.targetIntakes defined');

    // Section 6: University Shortlist (Tier 2)
    assert.ok(Student.schema.paths['shortlist'], 'shortlist subdocument array defined');

    // Section 7: Active Applications (Tier 2)
    assert.ok(Student.schema.paths['applications'], 'applications subdocument array defined');

    // Section 8: Internal Notes & Timeline (Tier 2)
    assert.ok(Student.schema.paths['notes'], 'notes subdocument array defined');
  });

  test('B3.32.2: Schema validates required fields and branch enum containment', () => {
    const invalidDoc = new Student({});
    const validationError = invalidDoc.validateSync();
    assert.ok(validationError, 'Validation error triggered on empty doc');

    assert.ok(validationError.errors.studentId, 'studentId is required');
    assert.ok(validationError.errors.branch, 'branch is required');
    assert.ok(validationError.errors.studentName, 'studentName is required');
    assert.ok(validationError.errors.email, 'email is required');

    // Branch enum validation
    const badBranchDoc = new Student({
      studentId: 'AET-DEL-2026-TEST',
      studentName: 'Test Student',
      email: 'test@example.com',
      branch: 'delhi_unauthorized',
    });
    const branchErr = badBranchDoc.validateSync();
    assert.ok(branchErr.errors.branch, 'Unauthorized branch is strictly rejected');

    // 'all' is invalid for physical student record (only valid for super admin session filter)
    const allBranchDoc = new Student({
      studentId: 'AET-ALL-2026-TEST',
      studentName: 'Test Student',
      email: 'test@example.com',
      branch: 'all',
    });
    const allBranchErr = allBranchDoc.validateSync();
    assert.ok(allBranchErr.errors.branch, 'Branch "all" is rejected on physical student document');

    // Valid physical branch passes
    const validBranchDoc = new Student({
      studentId: 'AET-BLR-2026-TEST',
      studentName: 'Test Student',
      email: 'test@example.com',
      branch: BRANCHES.BENGALURU,
    });
    const validErr = validBranchDoc.validateSync();
    assert.strictEqual(validErr, undefined, 'Valid student document with Bengaluru branch passes validation');
  });

  test('B3.32.3: Compound indexes and text search indexes are defined', () => {
    const indexes = Student.schema.indexes();
    const indexFields = indexes.map(([fields]) => Object.keys(fields).join('_'));

    assert.ok(
      indexFields.some((f) => f.includes('branch') && f.includes('isDeleted') && f.includes('status')),
      'Compound index { branch, isDeleted, status } defined'
    );
    assert.ok(
      indexFields.some((f) => f.includes('branch') && f.includes('email')),
      'Compound index { branch, email } defined'
    );
    assert.ok(
      indexFields.some((f) => f.includes('conversionSource.originalLeadId')),
      'Index on conversionSource.originalLeadId defined'
    );
    assert.ok(
      indexFields.some((f) => f.includes('branch') && f.includes('studentName')),
      'Compound index { branch, studentName } defined'
    );

    // Text search index verification
    const textIndex = indexes.find(([, options]) => options && options.name === 'student_text_search');
    assert.ok(textIndex, 'student_text_search index defined');
    const [textFields] = textIndex;
    assert.strictEqual(textFields.studentName, 'text');
    assert.strictEqual(textFields.email, 'text');
    assert.strictEqual(textFields.studentId, 'text');
  });

  test('B3.32.4: Pre-save hook synchronizes root fields into identity subdocument', () => {
    const doc = new Student({
      studentId: 'AET-MYS-2026-0001',
      studentName: 'Sanjay Gowda',
      email: 'SANJAY.GOWDA@EXAMPLE.COM',
      phone: '+919876543210',
      branch: BRANCHES.MYSURU,
    });

    // Execute validateSync / pre-save hook
    doc.validateSync();
    assert.strictEqual(doc.identity.studentName, 'Sanjay Gowda');
    assert.strictEqual(doc.identity.email, 'sanjay.gowda@example.com');
    assert.strictEqual(doc.identity.phone, '+919876543210');
  });
});

describe('Day 32: Student ID Generation Verification', () => {
  test('B3.32.5: Generates human-readable ID with branch code, year, and hex suffix', () => {
    const blrId = generateStudentId(BRANCHES.BENGALURU, new Date(2026, 0, 1));
    assert.match(blrId, /^AET-BLR-2026-[A-F0-9]{4}$/, 'Bengaluru ID format matches AET-BLR-2026-XXXX');

    const mysId = generateStudentId(BRANCHES.MYSURU, new Date(2026, 5, 15));
    assert.match(mysId, /^AET-MYS-2026-[A-F0-9]{4}$/, 'Mysuru ID format matches AET-MYS-2026-XXXX');

    const belId = generateStudentId(BRANCHES.BELAGAVI, new Date(2026, 11, 31));
    assert.match(belId, /^AET-BEL-2026-[A-F0-9]{4}$/, 'Belagavi ID format matches AET-BEL-2026-XXXX');
  });

  test('B3.32.6: Unrecognized branch defaults gracefully to HQ code', () => {
    const fallbackId = generateStudentId('unknown_city', new Date(2026, 0, 1));
    assert.match(fallbackId, /^AET-HQ-2026-[A-F0-9]{4}$/, 'Unrecognized branch defaults to HQ');
  });
});

describe('Day 32: Lead Conversion Service & Attribution Integrity', () => {
  test('B3.32.7: Lead conversion maps lead data into 8 profile sections', async () => {
    const leadId = new mongoose.Types.ObjectId();
    const counsellorId = new mongoose.Types.ObjectId();

    const mockLead = {
      _id: leadId,
      studentName: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      phone: '+919845012345',
      programme: 'MSc Data Science',
      university: 'University of Manchester',
      destination: 'United Kingdom',
      intake: 'Fall 2026',
      branch: BRANCHES.BENGALURU,
      stage: 'counselling_completed',
      counsellor: counsellorId,
      counsellorName: 'Anita Rao',
      notes: 'Interested in UK post-study work visa. IELTS 7.5 completed.',
      createdAt: new Date('2026-10-15T10:00:00Z'),
      stageHistory: [],
      save: async function () {
        return this;
      },
    };

    const mockUser = {
      _id: counsellorId,
      name: 'Anita Rao',
      role: ROLES.COUNSELLOR,
      branch: BRANCHES.BENGALURU,
    };

    // Temporarily mock Student.findOne and Student.prototype.save
    const originalFindOne = Student.findOne;
    const originalSave = Student.prototype.save;
    Student.findOne = async () => null;
    Student.prototype.save = async function () {
      return this;
    };

    try {
      const result = await convertLeadToStudent({
        lead: mockLead,
        user: mockUser,
        conversionNotes: 'Counselled and approved for direct application processing.',
      });

      assert.strictEqual(result.success, true);
      assert.ok(result.student, 'Student profile created');
      const student = result.student;

      // 1. Identity & Contact Section
      assert.strictEqual(student.studentName, 'Priya Sharma');
      assert.strictEqual(student.email, 'priya.sharma@example.com');
      assert.strictEqual(student.phone, '+919845012345');
      assert.strictEqual(student.branch, BRANCHES.BENGALURU);
      assert.strictEqual(student.status, STUDENT_STATUS.ACTIVE);

      // 2. Preferences Section
      assert.deepStrictEqual(student.preferences.destinationCountries, ['United Kingdom']);
      assert.deepStrictEqual(student.preferences.targetIntakes, ['Fall 2026']);
      assert.deepStrictEqual(student.preferences.targetFieldsOfStudy, ['MSc Data Science']);

      // 3. University Shortlist Section
      assert.strictEqual(student.shortlist.length, 1);
      assert.strictEqual(student.shortlist[0].universityName, 'University of Manchester');
      assert.strictEqual(student.shortlist[0].category, 'target');

      // 4. Notes Section
      assert.strictEqual(student.notes.length, 2);
      assert.strictEqual(student.notes[0].content, 'Interested in UK post-study work visa. IELTS 7.5 completed.');
      assert.strictEqual(student.notes[1].content, 'Counselled and approved for direct application processing.');

      // 5. Immutable Source Attribution
      assert.strictEqual(student.conversionSource.originalLeadId, leadId);
      assert.strictEqual(student.conversionSource.convertedBy, counsellorId);
      assert.strictEqual(student.conversionSource.convertedByName, 'Anita Rao');
      assert.strictEqual(student.conversionSource.initialStageAtConversion, 'counselling_completed');
      assert.strictEqual(student.conversionSource.conversionNotes, 'Counselled and approved for direct application processing.');

      // 6. Lead Backlink Verification
      assert.strictEqual(mockLead.convertedToStudent, student._id);
      assert.strictEqual(mockLead.convertedBy, counsellorId);
      assert.strictEqual(mockLead.stageHistory.length, 1);
      assert.ok(mockLead.stageHistory[0].reason.includes('Lead converted to Student 360 profile'));
    } finally {
      Student.findOne = originalFindOne;
      Student.prototype.save = originalSave;
    }
  });

  test('B3.32.8: Duplicate Prevention Rule A: Re-converting already-converted lead is rejected', async () => {
    const leadId = new mongoose.Types.ObjectId();
    const existingStudentId = new mongoose.Types.ObjectId();

    const mockLead = {
      _id: leadId,
      studentName: 'Vikram Patil',
      email: 'vikram.patil@example.com',
      branch: BRANCHES.BELAGAVI,
      convertedToStudent: existingStudentId,
    };

    const mockExistingStudent = {
      _id: existingStudentId,
      studentId: 'AET-BEL-2026-X1Y2',
      studentName: 'Vikram Patil',
      email: 'vikram.patil@example.com',
      branch: BRANCHES.BELAGAVI,
    };

    const originalFindById = Student.findById;
    Student.findById = async (id) => (String(id) === String(existingStudentId) ? mockExistingStudent : null);

    try {
      const result = await convertLeadToStudent({
        lead: mockLead,
        user: { role: ROLES.SUPER_ADMIN, branch: 'all' },
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.duplicate, true);
      assert.strictEqual(result.code, 'LEAD_ALREADY_CONVERTED');
      assert.ok(result.message.includes('AET-BEL-2026-X1Y2'));
    } finally {
      Student.findById = originalFindById;
    }
  });

  test('B3.32.9: Duplicate Prevention Rule B: Email collision in same branch is rejected', async () => {
    const leadId = new mongoose.Types.ObjectId();

    const mockLead = {
      _id: leadId,
      studentName: 'Kavita Hegde',
      email: 'kavita.hegde@example.com',
      branch: BRANCHES.MYSURU,
    };

    const originalFindOne = Student.findOne;
    Student.findOne = async (query) => {
      if (query.branch === BRANCHES.MYSURU && query.email === 'kavita.hegde@example.com') {
        return {
          _id: new mongoose.Types.ObjectId(),
          studentId: 'AET-MYS-2026-D4E5',
          email: 'kavita.hegde@example.com',
          branch: BRANCHES.MYSURU,
        };
      }
      return null;
    };

    try {
      const result = await convertLeadToStudent({
        lead: mockLead,
        user: { role: ROLES.BRANCH_MANAGER, branch: BRANCHES.MYSURU },
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.duplicate, true);
      assert.strictEqual(result.code, 'DUPLICATE_STUDENT_EMAIL');
      assert.ok(result.message.includes('already exists in the mysuru branch'));
    } finally {
      Student.findOne = originalFindOne;
    }
  });

  test('B3.32.10: Cross-branch conversion is strictly blocked for non-super users', async () => {
    const leadId = new mongoose.Types.ObjectId();

    const mockLead = {
      _id: leadId,
      studentName: 'Bengaluru Student',
      email: 'bengaluru.student@example.com',
      branch: BRANCHES.BENGALURU,
    };

    const mysuruManager = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Mysuru Manager',
      role: ROLES.BRANCH_MANAGER,
      branch: BRANCHES.MYSURU,
    };

    const result = await convertLeadToStudent({
      lead: mockLead,
      user: mysuruManager,
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.code, 'CROSS_BRANCH_CONVERSION_FORBIDDEN');
    assert.ok(result.message.includes('Cannot convert lead registered under bengaluru branch'));
  });

  test('B3.32.11: Super Admin can convert leads across any branch', async () => {
    const leadId = new mongoose.Types.ObjectId();

    const mockLead = {
      _id: leadId,
      studentName: 'Belagavi Student',
      email: 'belagavi.student@example.com',
      branch: BRANCHES.BELAGAVI,
      save: async function () {
        return this;
      },
    };

    const superAdmin = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Super Admin',
      role: ROLES.SUPER_ADMIN,
      branch: 'all',
    };

    const originalFindOne = Student.findOne;
    const originalSave = Student.prototype.save;
    Student.findOne = async () => null;
    Student.prototype.save = async function () {
      return this;
    };

    try {
      const result = await convertLeadToStudent({
        lead: mockLead,
        user: superAdmin,
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.student.branch, BRANCHES.BELAGAVI);
      assert.strictEqual(result.student.conversionSource.convertedBy, superAdmin._id);
    } finally {
      Student.findOne = originalFindOne;
      Student.prototype.save = originalSave;
    }
  });
});
