const crypto = require('crypto');
const Student = require('./student.model');
const PipelineStudent = require('../pipeline/pipeline.model');
const {
  BRANCHES,
  BRANCH_CODES,
  STUDENT_STATUS,
  ROLES,
} = require('../../config/constants');

/**
 * Generates an immutable, human-readable Student ID formatted as:
 * AET-{BRANCH_CODE}-{YEAR}-{UNIQUE_HASH}
 * Example: AET-BLR-2026-7A9B
 *
 * @param {string} branch - Operating branch ('bengaluru', 'mysuru', 'belagavi')
 * @param {Date} [date] - Conversion reference date
 * @returns {string} Unique student ID
 */
function generateStudentId(branch, date = new Date()) {
  const branchCode = BRANCH_CODES[branch] || 'HQ';
  const year = date.getFullYear();
  const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `AET-${branchCode}-${year}-${randomSuffix}`;
}

/**
 * Converts an admissions pipeline candidate / lead into a comprehensive
 * Student 360° profile while preserving immutable source attribution,
 * preventing duplicates, and enforcing multi-branch containment.
 *
 * @param {Object} params
 * @param {Object} params.lead - The PipelineStudent Mongoose document or plain object
 * @param {Object} params.user - The acting staff user initiating conversion
 * @param {string} [params.conversionNotes] - Optional counsellor remarks on conversion
 * @param {Object} [params.additionalProfileData] - Optional deep profile data provided at conversion
 * @returns {Promise<{ success: boolean, student?: Object, duplicate?: boolean, code?: string, message: string }>}
 */
async function convertLeadToStudent({
  lead,
  user,
  conversionNotes = '',
  additionalProfileData = {},
}) {
  if (!lead || !lead._id) {
    return {
      success: false,
      code: 'INVALID_LEAD',
      message: 'Valid lead document is required for student conversion.',
    };
  }

  // 1. Branch Authorization Guard
  // Non-super users are strictly confined to their own branch
  if (
    user &&
    user.role !== ROLES.SUPER_ADMIN &&
    user.branch !== 'all' &&
    user.branch !== lead.branch
  ) {
    return {
      success: false,
      code: 'CROSS_BRANCH_CONVERSION_FORBIDDEN',
      message: `Unauthorized: Cannot convert lead registered under ${lead.branch} branch.`,
    };
  }

  // 2. Duplicate Prevention Rule A: Lead Already Converted
  // Check if lead was previously converted via lead field or student query
  if (lead.convertedToStudent) {
    const existingStudent = await Student.findById(lead.convertedToStudent);
    if (existingStudent) {
      return {
        success: false,
        duplicate: true,
        code: 'LEAD_ALREADY_CONVERTED',
        student: existingStudent,
        message: `Lead has already been converted to student with ID: ${existingStudent.studentId}.`,
      };
    }
  }

  const existingConversion = await Student.findOne({
    'conversionSource.originalLeadId': lead._id,
    isDeleted: false,
  });

  if (existingConversion) {
    return {
      success: false,
      duplicate: true,
      code: 'LEAD_ALREADY_CONVERTED',
      student: existingConversion,
      message: `Lead has already been converted to student with ID: ${existingConversion.studentId}.`,
    };
  }

  // 3. Duplicate Prevention Rule B: Email collision in the same branch
  const normalizedEmail = (lead.email || '').toLowerCase().trim();
  if (normalizedEmail) {
    const duplicateEmailStudent = await Student.findOne({
      branch: lead.branch,
      email: normalizedEmail,
      isDeleted: false,
    });

    if (duplicateEmailStudent) {
      return {
        success: false,
        duplicate: true,
        code: 'DUPLICATE_STUDENT_EMAIL',
        student: duplicateEmailStudent,
        message: `A student with email "${normalizedEmail}" already exists in the ${lead.branch} branch (ID: ${duplicateEmailStudent.studentId}).`,
      };
    }
  }

  // 4. Generate collision-resistant unique student ID
  let studentId = generateStudentId(lead.branch);
  let idCollision = await Student.findOne({ studentId });
  let attempts = 0;
  while (idCollision && attempts < 5) {
    studentId = generateStudentId(lead.branch);
    idCollision = await Student.findOne({ studentId });
    attempts += 1;
  }

  // 5. Build Initial 8-Section Student 360° Profile
  const now = new Date();

  // Initial shortlist item from lead data if university is defined
  const initialShortlist = [];
  if (lead.university && lead.university.trim()) {
    initialShortlist.push({
      universityName: lead.university.trim(),
      programme: lead.programme || 'Undergraduate / Postgraduate',
      country: lead.destination || 'United Kingdom',
      category: 'target',
      status: 'shortlisted',
    });
  }
  if (Array.isArray(additionalProfileData.shortlist)) {
    initialShortlist.push(...additionalProfileData.shortlist);
  }

  // Initial active application from lead stage if stage indicates active filing
  const initialApplications = [];
  const activeApplicationStages = [
    'application_started',
    'submitted',
    'offer_received',
    'deposit_paid',
    'visa_filed',
    'visa_decision',
    'pre_departure',
    'enrolled',
  ];

  if (activeApplicationStages.includes(lead.stage) && lead.university && lead.university.trim()) {
    initialApplications.push({
      universityName: lead.university.trim(),
      programme: lead.programme || '',
      country: lead.destination || '',
      status: lead.stage === 'enrolled' ? 'enrolled' : 'submitted',
      submittedDate: now,
    });
  }
  if (Array.isArray(additionalProfileData.applications)) {
    initialApplications.push(...additionalProfileData.applications);
  }

  // Notes consolidation
  const initialNotes = [];
  if (lead.notes && lead.notes.trim()) {
    initialNotes.push({
      content: lead.notes.trim(),
      category: 'general',
      author: lead.counsellor || user?._id,
      authorName: lead.counsellorName || user?.name || 'Staff',
      createdAt: lead.createdAt || now,
    });
  }
  if (conversionNotes && conversionNotes.trim()) {
    initialNotes.push({
      content: conversionNotes.trim(),
      category: 'counselling',
      author: user?._id,
      authorName: user?.name || 'Staff',
      createdAt: now,
    });
  }

  const studentData = {
    studentId,
    branch: lead.branch,
    status: STUDENT_STATUS.ACTIVE,
    studentName: lead.studentName.trim(),
    email: normalizedEmail,
    phone: (lead.phone || '').trim(),

    // Section 1: Detailed Identity
    identity: {
      studentName: lead.studentName.trim(),
      email: normalizedEmail,
      phone: (lead.phone || '').trim(),
      dob: additionalProfileData.identity?.dob || null,
      gender: additionalProfileData.identity?.gender || '',
      address: additionalProfileData.identity?.address || {
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'India',
      },
      passport: additionalProfileData.identity?.passport || {
        passportNumber: '',
        issuingCountry: 'India',
      },
      emergencyContact: additionalProfileData.identity?.emergencyContact || {},
    },

    // Section 2: Academic History
    academics: additionalProfileData.academics || {
      highestQualification: '',
      undergradCgpa: null,
      activeBacklogs: 0,
      totalBacklogs: 0,
      records: [],
    },

    // Section 3: Test Scores
    testScores: additionalProfileData.testScores || {
      records: [],
    },

    // Section 4: Financial Capability
    financial: additionalProfileData.financial || {
      annualBudget: 0,
      budgetCurrency: 'INR',
      fundingSource: 'undecided',
      loanStatus: 'not_required',
      loanSanctionAmount: 0,
      sponsorDetails: {},
    },

    // Section 5: Study Preferences
    preferences: {
      destinationCountries: lead.destination
        ? [lead.destination.trim()]
        : additionalProfileData.preferences?.destinationCountries || [],
      targetDegreeLevel: additionalProfileData.preferences?.targetDegreeLevel || 'masters',
      targetFieldsOfStudy: lead.programme
        ? [lead.programme.trim()]
        : additionalProfileData.preferences?.targetFieldsOfStudy || [],
      targetIntakes: lead.intake
        ? [lead.intake.trim()]
        : additionalProfileData.preferences?.targetIntakes || [],
      visaRefusalHistory: additionalProfileData.preferences?.visaRefusalHistory || {
        hasRefusal: false,
        details: '',
        countries: [],
      },
    },

    // Section 6: University Shortlist
    shortlist: initialShortlist,

    // Section 7: Active Applications
    applications: initialApplications,

    // Section 8: Internal Notes & Timeline
    notes: initialNotes,

    // Assigned Staff
    assignedCounsellor: lead.counsellor || (user?.role === ROLES.COUNSELLOR ? user._id : null),
    assignedCounsellorName:
      lead.counsellorName || (user?.role === ROLES.COUNSELLOR ? user.name : ''),
    assignedApplicationOfficer: null,
    assignedApplicationOfficerName: '',

    // Immutable Source Attribution
    conversionSource: {
      originalLeadId: lead._id,
      originalSource: lead.source || 'admissions_pipeline',
      convertedAt: now,
      convertedBy: user?._id || null,
      convertedByName: user?.name || 'Staff',
      conversionNotes: conversionNotes.trim(),
      initialStageAtConversion: lead.stage || '',
      leadCreatedAt: lead.createdAt || null,
    },
  };

  // 6. Save Student record
  const student = new Student(studentData);
  await student.save();

  // 7. Update source lead record with backlink and audit entry
  try {
    if (typeof lead.save === 'function') {
      lead.convertedToStudent = student._id;
      lead.convertedAt = now;
      lead.convertedBy = user?._id || null;

      if (Array.isArray(lead.stageHistory)) {
        lead.stageHistory.push({
          fromStage: lead.stage,
          toStage: lead.stage,
          changedAt: now,
          changedBy: user?._id || null,
          reason: `Lead converted to Student 360 profile (${student.studentId})`,
        });
      }

      await lead.save();
    } else {
      // Plain object passed in tests or scripts: update via PipelineStudent model
      await PipelineStudent.findByIdAndUpdate(lead._id, {
        $set: {
          convertedToStudent: student._id,
          convertedAt: now,
          convertedBy: user?._id || null,
        },
        $push: {
          stageHistory: {
            fromStage: lead.stage,
            toStage: lead.stage,
            changedAt: now,
            changedBy: user?._id || null,
            reason: `Lead converted to Student 360 profile (${student.studentId})`,
          },
        },
      });
    }
  } catch (linkError) {
    // Non-fatal if lead model update fails in decoupled unit tests
    console.warn(`[StudentConversion] Note: Linking to lead ${lead._id} returned:`, linkError.message);
  }

  return {
    success: true,
    student,
    message: `Lead successfully converted to Student 360 profile with ID ${student.studentId}.`,
  };
}

module.exports = {
  generateStudentId,
  convertLeadToStudent,
};
