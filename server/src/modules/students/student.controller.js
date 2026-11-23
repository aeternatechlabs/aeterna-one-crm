const mongoose = require('mongoose');
const Student = require('./student.model');
const PipelineStudent = require('../pipeline/pipeline.model');
const StudentAudit = require('./studentAudit.model');
const { validateTestScore, validateAcademicRecord } = require('./academicValidation');
const { asyncHandler, ApiError, ApiResponse } = require('../../utils/devilWrapper');
const {
  ROLES,
  BRANCHES,
  STUDENT_STATUS,
} = require('../../config/constants');
const {
  generateStudentId,
  convertLeadToStudent,
} = require('./studentConversion.service');

// Projection allowlist for GET /api/v1/students?fields=...
const ALLOWED_STUDENT_LIST_FIELDS = new Set([
  '_id',
  'studentId',
  'studentName',
  'email',
  'phone',
  'branch',
  'status',
  'assignedCounsellor',
  'assignedCounsellorName',
  'assignedApplicationOfficer',
  'assignedApplicationOfficerName',
  'identity',
  'preferences',
  'shortlist',
  'applications',
  'academics',
  'testScores',
  'financial',
  'conversionSource',
  'createdAt',
  'updatedAt',
]);

// System-managed fields that client requests cannot provide during creation
const SYSTEM_MANAGED_CREATION_FIELDS = new Set([
  '_id',
  'studentId',
  'conversionSource',
  'isDeleted',
  'deletedAt',
  'deletedBy',
  'deletionReason',
  'isAnonymized',
  'anonymizedAt',
  'createdAt',
  'updatedAt',
  '__v',
]);

// Immutable fields that cannot be modified directly on update (PATCH)
const IMMUTABLE_UPDATE_FIELDS = new Set([
  '_id',
  'studentId',
  'branch',
  'conversionSource',
  'isDeleted',
  'deletedAt',
  'deletedBy',
  'deletionReason',
  'isAnonymized',
  'anonymizedAt',
  'createdAt',
  'updatedAt',
  '__v',
]);

// Fields that only Branch Managers and Super Admins can update
const MANAGER_ADMIN_ONLY_FIELDS = new Set([
  'status',
  'assignedCounsellor',
  'assignedCounsellorName',
  'assignedApplicationOfficer',
  'assignedApplicationOfficerName',
]);

/**
 * Apply role-based field masking based on data sensitivity tiers (DPDP/GDPR)
 */
function applyRoleBasedMasking(studentDoc, userRole) {
  const plainStudent =
    typeof studentDoc.toObject === 'function' ? studentDoc.toObject() : JSON.parse(JSON.stringify(studentDoc));

  // Counsellors view status and operational data; mask sensitive passport and exact sponsor income figures
  if (userRole === ROLES.COUNSELLOR) {
    if (plainStudent.identity && plainStudent.identity.passport && plainStudent.identity.passport.passportNumber) {
      const pNum = String(plainStudent.identity.passport.passportNumber);
      plainStudent.identity.passport.passportNumber =
        pNum.length > 4 ? '****' + pNum.slice(-4) : '****';
    }
    if (plainStudent.financial && plainStudent.financial.sponsorDetails) {
      delete plainStudent.financial.sponsorDetails.annualIncome;
    }
  }

  return plainStudent;
}

/**
 * List Student Profiles (Paginated, Branch-Scoped, Searchable)
 * GET /api/v1/students
 */
const getStudents = asyncHandler(async (req, res) => {
  const { branch, status, search, fields, page = 1, limit = 20 } = req.query;
  const filter = { isDeleted: false };

  // 1. Branch isolation scoping
  if (req.branchScope && req.branchScope !== 'all') {
    filter.branch = req.branchScope;
  } else if (branch && branch !== 'all') {
    filter.branch = branch;
  }

  // 2. Status filter
  if (status && Object.values(STUDENT_STATUS).includes(status)) {
    filter.status = status;
  }

  // 3. Search query
  if (search && typeof search === 'string') {
    const trimmedSearch = search.trim();
    if (trimmedSearch.length > 80) {
      throw new ApiError(400, 'Search term cannot exceed 80 characters');
    }
    if (trimmedSearch.length > 0) {
      const escaped = trimmedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { studentName: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
        { studentId: { $regex: escaped, $options: 'i' } },
      ];
    }
  }

  // 4. Field projection allowlisting
  let selectProjection = '';
  if (fields && typeof fields === 'string') {
    const requestedFields = fields
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);

    const invalidFields = requestedFields.filter((f) => !ALLOWED_STUDENT_LIST_FIELDS.has(f));
    if (invalidFields.length > 0) {
      throw new ApiError(400, `Invalid fields requested: ${invalidFields.join(', ')}`);
    }

    selectProjection = requestedFields.join(' ');
  } else {
    // Default projection for high-performance list rendering
    selectProjection =
      'studentId studentName email phone branch status assignedCounsellorName preferences.destinationCountries createdAt updatedAt';
  }

  // 5. Pagination calculation
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  const [total, rawStudents] = await Promise.all([
    Student.countDocuments(filter),
    Student.find(filter)
      .select(selectProjection)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
  ]);

  const students = rawStudents.map((s) => applyRoleBasedMasking(s, req.user?.role));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        students,
        pagination: {
          total,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: Math.ceil(total / parsedLimit) || 1,
        },
      },
      'Student profiles retrieved successfully'
    )
  );
});

/**
 * Get Student Profile by ID
 * GET /api/v1/students/:id
 */
const getStudentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid student ID format');
  }

  const student = await Student.findOne({ _id: id, isDeleted: false });
  if (!student) {
    throw new ApiError(404, 'Student profile not found');
  }

  // Record-level branch containment guard
  if (
    req.user?.role !== ROLES.SUPER_ADMIN &&
    req.branchScope !== 'all' &&
    student.branch !== req.user?.branch
  ) {
    throw new ApiError(403, 'Unauthorized to view student record outside your assigned branch');
  }

  const maskedStudent = applyRoleBasedMasking(student, req.user?.role);

  return res.status(200).json(
    new ApiResponse(200, { student: maskedStudent }, 'Student profile retrieved successfully')
  );
});

/**
 * Create a new Student Profile directly
 * POST /api/v1/students
 */
const createStudent = asyncHandler(async (req, res) => {
  const { studentName, email, phone, branch, identity, academics, testScores, financial, preferences, shortlist } =
    req.body;

  // 1. Branch authorization check (Non-super staff strictly restricted to own branch)
  if (req.user?.role !== ROLES.SUPER_ADMIN && req.branchScope !== 'all') {
    if (branch && branch !== req.user?.branch) {
      throw new ApiError(403, 'Unauthorized to create student in another branch');
    }
  }

  // 2. Check for illegal system-managed field tampering
  const attemptedSystemFields = Object.keys(req.body).filter((k) => SYSTEM_MANAGED_CREATION_FIELDS.has(k));
  if (attemptedSystemFields.length > 0) {
    throw new ApiError(
      400,
      `System-managed fields cannot be provided during student creation: ${attemptedSystemFields.join(', ')}`
    );
  }

  // 3. Validate mandatory fields
  if (!studentName || typeof studentName !== 'string' || studentName.trim().length < 2) {
    throw new ApiError(400, 'Student name is required and must be at least 2 characters');
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw new ApiError(400, 'Valid student email is required');
  }

  // 4. Resolve and validate branch
  let targetBranch = req.user?.branch;
  if (req.user?.role === ROLES.SUPER_ADMIN || req.branchScope === 'all') {
    targetBranch = branch || req.user?.branch;
    if (!targetBranch || !Object.values(BRANCHES).filter((b) => b !== 'all').includes(targetBranch)) {
      throw new ApiError(400, 'Valid branch is required for student registration (bengaluru, mysuru, belagavi)');
    }
  } else {
    targetBranch = req.user?.branch;
  }

  // 4. Duplicate check within same branch
  const normalizedEmail = email.toLowerCase().trim();
  const duplicate = await Student.findOne({
    branch: targetBranch,
    email: normalizedEmail,
    isDeleted: false,
  });

  if (duplicate) {
    throw new ApiError(409, `A student with email "${normalizedEmail}" already exists in the ${targetBranch} branch (ID: ${duplicate.studentId})`);
  }

  // 5. Generate unique student ID
  const studentId = generateStudentId(targetBranch);

  const newStudent = new Student({
    studentId,
    branch: targetBranch,
    status: STUDENT_STATUS.ACTIVE,
    studentName: studentName.trim(),
    email: normalizedEmail,
    phone: phone ? String(phone).trim() : '',
    identity: identity || {},
    academics: academics || {},
    testScores: testScores || {},
    financial: financial || {},
    preferences: preferences || {},
    shortlist: shortlist || [],
    assignedCounsellor: req.user?.role === ROLES.COUNSELLOR ? req.user._id : null,
    assignedCounsellorName: req.user?.role === ROLES.COUNSELLOR ? req.user.name : '',
    conversionSource: {
      originalSource: 'direct_entry',
      convertedAt: new Date(),
      convertedBy: req.user?._id || null,
      convertedByName: req.user?.name || 'Staff',
      conversionNotes: 'Directly registered student profile',
    },
  });

  await newStudent.save();

  return res.status(201).json(
    new ApiResponse(201, { student: newStudent }, 'Student profile created successfully')
  );
});

/**
 * Update Student Profile
 * PATCH /api/v1/students/:id
 */
const updateStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid student ID format');
  }

  const student = await Student.findOne({ _id: id, isDeleted: false });
  if (!student) {
    throw new ApiError(404, 'Student profile not found');
  }

  // Record-level branch containment guard
  if (
    req.user?.role !== ROLES.SUPER_ADMIN &&
    req.branchScope !== 'all' &&
    student.branch !== req.user?.branch
  ) {
    throw new ApiError(403, 'Unauthorized to modify student records outside your assigned branch');
  }

  // 1. Guard against system-managed field tampering
  const attemptedSystemFields = Object.keys(req.body).filter((k) => IMMUTABLE_UPDATE_FIELDS.has(k));
  if (attemptedSystemFields.length > 0) {
    throw new ApiError(
      400,
      `System-managed fields cannot be modified directly: ${attemptedSystemFields.join(', ')}`
    );
  }

  // 2. Role-based field permissions
  const isManagerOrAdmin =
    req.user?.role === ROLES.SUPER_ADMIN || req.user?.role === ROLES.BRANCH_MANAGER;

  const attemptedManagerFields = Object.keys(req.body).filter((k) => MANAGER_ADMIN_ONLY_FIELDS.has(k));
  if (!isManagerOrAdmin && attemptedManagerFields.length > 0) {
    throw new ApiError(
      403,
      `Only Branch Manager or Super Admin can modify administrative fields: ${attemptedManagerFields.join(', ')}`
    );
  }

  // 3. Apply permitted mutations
  const allowedKeys = [
    'studentName',
    'phone',
    'identity',
    'academics',
    'testScores',
    'financial',
    'preferences',
    'shortlist',
    'applications',
  ];

  if (isManagerOrAdmin) {
    allowedKeys.push(...MANAGER_ADMIN_ONLY_FIELDS);
  }

  for (const key of allowedKeys) {
    if (req.body[key] !== undefined) {
      if (key === 'studentName' && typeof req.body[key] === 'string') {
        const trimmed = req.body[key].trim();
        if (trimmed.length < 2) {
          throw new ApiError(400, 'Student name must be at least 2 characters');
        }
        student.studentName = trimmed;
      } else if (key === 'identity' && typeof req.body[key] === 'object') {
        student.identity = { ...student.identity?.toObject?.() || {}, ...req.body[key] };
      } else if (key === 'academics' && typeof req.body[key] === 'object') {
        student.academics = { ...student.academics?.toObject?.() || {}, ...req.body[key] };
      } else if (key === 'testScores' && typeof req.body[key] === 'object') {
        student.testScores = { ...student.testScores?.toObject?.() || {}, ...req.body[key] };
      } else if (key === 'financial' && typeof req.body[key] === 'object') {
        student.financial = { ...student.financial?.toObject?.() || {}, ...req.body[key] };
      } else if (key === 'preferences' && typeof req.body[key] === 'object') {
        student.preferences = { ...student.preferences?.toObject?.() || {}, ...req.body[key] };
      } else {
        student[key] = req.body[key];
      }
    }
  }

  await student.save();

  const maskedUpdated = applyRoleBasedMasking(student, req.user?.role);

  return res.status(200).json(
    new ApiResponse(200, { student: maskedUpdated }, 'Student profile updated successfully')
  );
});

/**
 * Add an Internal Note to Student Timeline
 * POST /api/v1/students/:id/notes
 */
const addStudentNote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content, category = 'general' } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid student ID format');
  }

  if (!content || typeof content !== 'string' || content.trim().length < 3) {
    throw new ApiError(400, 'Note content is required and must be at least 3 characters');
  }

  const student = await Student.findOne({ _id: id, isDeleted: false });
  if (!student) {
    throw new ApiError(404, 'Student profile not found');
  }

  // Branch isolation
  if (
    req.user?.role !== ROLES.SUPER_ADMIN &&
    req.branchScope !== 'all' &&
    student.branch !== req.user?.branch
  ) {
    throw new ApiError(403, 'Unauthorized to add notes to student record outside your assigned branch');
  }

  const newNote = {
    content: content.trim(),
    category,
    author: req.user?._id,
    authorName: req.user?.name || 'Staff',
    createdAt: new Date(),
  };

  student.notes.push(newNote);
  await student.save();

  return res.status(201).json(
    new ApiResponse(
      201,
      { note: student.notes[student.notes.length - 1], studentId: student.studentId },
      'Internal note added successfully'
    )
  );
});

/**
 * Convert Pipeline Lead to Student 360° Profile
 * POST /api/v1/students/convert-lead
 */
const convertLead = asyncHandler(async (req, res) => {
  const { leadId, conversionNotes, additionalProfileData } = req.body;

  if (!leadId || !mongoose.Types.ObjectId.isValid(leadId)) {
    throw new ApiError(400, 'Valid leadId is required for student conversion');
  }

  const lead = await PipelineStudent.findById(leadId);
  if (!lead) {
    throw new ApiError(404, 'Pipeline lead candidate not found');
  }

  const result = await convertLeadToStudent({
    lead,
    user: req.user,
    conversionNotes,
    additionalProfileData,
  });

  if (!result.success) {
    if (result.duplicate) {
      throw new ApiError(409, result.message, { code: result.code, student: result.student });
    }
    if (result.code === 'CROSS_BRANCH_CONVERSION_FORBIDDEN') {
      throw new ApiError(403, result.message);
    }
    throw new ApiError(400, result.message);
  }

  return res.status(201).json(
    new ApiResponse(201, result, result.message)
  );
});

const ALLOWED_CURRENCIES = new Set(['INR', 'USD', 'GBP', 'CAD', 'EUR', 'AUD', 'SGD', 'NZD', 'AED', 'CHF']);

/**
 * Add Academic Record
 * POST /api/v1/students/:id/academics
 */
const addAcademicRecord = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    level,
    institution,
    boardOrUniversity,
    yearOfPassing,
    score,
    gradingSystem,
    major,
    highestQualification,
    undergradCgpa,
    activeBacklogs,
    totalBacklogs,
  } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid student ID format');
  }

  const student = await Student.findOne({ _id: id, isDeleted: false });
  if (!student) {
    throw new ApiError(404, 'Student profile not found');
  }

  // Branch containment guard
  if (
    req.user?.role !== ROLES.SUPER_ADMIN &&
    req.branchScope !== 'all' &&
    student.branch !== req.user?.branch
  ) {
    throw new ApiError(403, 'Unauthorized to modify student record outside your assigned branch');
  }

  // Validate qualification record
  const recordToValidate = { level, institution, boardOrUniversity, yearOfPassing, score, gradingSystem, major };
  const validation = validateAcademicRecord(recordToValidate);
  if (!validation.valid) {
    throw new ApiError(400, validation.error);
  }

  // Append record
  student.academics.records.push({
    level,
    institution: institution ? String(institution).trim() : '',
    boardOrUniversity: boardOrUniversity ? String(boardOrUniversity).trim() : '',
    yearOfPassing: yearOfPassing ? Number(yearOfPassing) : undefined,
    score: score ? String(score).trim() : '',
    gradingSystem: gradingSystem || 'percentage',
    major: major ? String(major).trim() : '',
  });

  if (highestQualification) {
    student.academics.highestQualification = String(highestQualification).trim();
  }
  if (undergradCgpa !== undefined && undergradCgpa !== null) {
    const cgpa = Number(undergradCgpa);
    if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
      throw new ApiError(400, 'Undergraduate CGPA must be a number between 0 and 10');
    }
    student.academics.undergradCgpa = cgpa;
  }
  if (activeBacklogs !== undefined) {
    student.academics.activeBacklogs = Math.max(0, parseInt(activeBacklogs, 10) || 0);
  }
  if (totalBacklogs !== undefined) {
    student.academics.totalBacklogs = Math.max(0, parseInt(totalBacklogs, 10) || 0);
  }

  await student.save();

  // Audit event
  await StudentAudit.create({
    student: student._id,
    studentIdCode: student.studentId,
    branch: student.branch,
    action: 'ACADEMIC_RECORD_ADDED',
    actor: req.user._id,
    actorName: req.user.name || 'Staff',
    actorRole: req.user.role || '',
    details: { level, institution, score, gradingSystem },
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        academics: student.academics,
        addedRecord: student.academics.records[student.academics.records.length - 1],
      },
      'Academic record added successfully'
    )
  );
});

/**
 * Add Standardized Test Score
 * POST /api/v1/students/:id/test-scores
 */
const addTestScore = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { testType, overallScore, subScores, testDate, validUntil, trfNumber } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid student ID format');
  }

  const student = await Student.findOne({ _id: id, isDeleted: false });
  if (!student) {
    throw new ApiError(404, 'Student profile not found');
  }

  // Branch containment guard
  if (
    req.user?.role !== ROLES.SUPER_ADMIN &&
    req.branchScope !== 'all' &&
    student.branch !== req.user?.branch
  ) {
    throw new ApiError(403, 'Unauthorized to modify student record outside your assigned branch');
  }

  // Validate test score
  const validation = validateTestScore({ testType, overallScore, subScores, testDate, validUntil, trfNumber });
  if (!validation.valid) {
    throw new ApiError(400, validation.error);
  }

  const newScore = {
    testType,
    overallScore: Number(overallScore),
    subScores: subScores || {},
    testDate: testDate ? new Date(testDate) : undefined,
    validUntil: validUntil ? new Date(validUntil) : undefined,
    trfNumber: trfNumber ? String(trfNumber).trim() : '',
    isVerified: false,
  };

  student.testScores.records.push(newScore);
  await student.save();

  // Audit event
  await StudentAudit.create({
    student: student._id,
    studentIdCode: student.studentId,
    branch: student.branch,
    action: 'TEST_SCORE_ADDED',
    actor: req.user._id,
    actorName: req.user.name || 'Staff',
    actorRole: req.user.role || '',
    details: { testType, overallScore, testDate },
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        testScores: student.testScores,
        addedScore: student.testScores.records[student.testScores.records.length - 1],
      },
      'Test score added successfully'
    )
  );
});

/**
 * Verify Test Score (TRF Verification)
 * PATCH /api/v1/students/:id/test-scores/:scoreId/verify
 */
const verifyTestScore = asyncHandler(async (req, res) => {
  const { id, scoreId } = req.params;
  const { isVerified = true, trfNumber } = req.body;

  // Authorization gate: Only Super Admin, Branch Manager, or Application Officer can verify
  const canVerify =
    req.user?.role === ROLES.SUPER_ADMIN ||
    req.user?.role === ROLES.BRANCH_MANAGER ||
    req.user?.role === ROLES.APPLICATION_OFFICER;

  if (!canVerify) {
    throw new ApiError(403, 'Only Branch Manager, Application Officer, or Super Admin can verify test scores');
  }

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(scoreId)) {
    throw new ApiError(400, 'Invalid ID format');
  }

  const student = await Student.findOne({ _id: id, isDeleted: false });
  if (!student) {
    throw new ApiError(404, 'Student profile not found');
  }

  // Branch containment guard
  if (
    req.user?.role !== ROLES.SUPER_ADMIN &&
    req.branchScope !== 'all' &&
    student.branch !== req.user?.branch
  ) {
    throw new ApiError(403, 'Unauthorized to modify student record outside your assigned branch');
  }

  const scoreRecord = student.testScores.records.id(scoreId);
  if (!scoreRecord) {
    throw new ApiError(404, 'Test score record not found on student profile');
  }

  scoreRecord.isVerified = Boolean(isVerified);
  if (trfNumber) {
    scoreRecord.trfNumber = String(trfNumber).trim();
  }

  await student.save();

  // Audit event
  await StudentAudit.create({
    student: student._id,
    studentIdCode: student.studentId,
    branch: student.branch,
    action: 'TEST_SCORE_VERIFIED',
    actor: req.user._id,
    actorName: req.user.name || 'Staff',
    actorRole: req.user.role || '',
    details: {
      scoreId,
      testType: scoreRecord.testType,
      isVerified: scoreRecord.isVerified,
      trfNumber: scoreRecord.trfNumber,
    },
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      { scoreRecord },
      `Test score ${scoreRecord.isVerified ? 'verified' : 'unverified'} successfully`
    )
  );
});

/**
 * Update Financial & Budget Profile
 * PATCH /api/v1/students/:id/financial
 */
const updateFinancial = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    annualBudget,
    budgetCurrency,
    fundingSource,
    loanStatus,
    loanAmount,
    sponsorDetails,
    visaRefusalHistory,
  } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid student ID format');
  }

  const student = await Student.findOne({ _id: id, isDeleted: false });
  if (!student) {
    throw new ApiError(404, 'Student profile not found');
  }

  // Branch containment guard
  if (
    req.user?.role !== ROLES.SUPER_ADMIN &&
    req.branchScope !== 'all' &&
    student.branch !== req.user?.branch
  ) {
    throw new ApiError(403, 'Unauthorized to modify student record outside your assigned branch');
  }

  const isManagerOrAdmin =
    req.user?.role === ROLES.SUPER_ADMIN || req.user?.role === ROLES.BRANCH_MANAGER;

  // Currency validation
  if (budgetCurrency && !ALLOWED_CURRENCIES.has(budgetCurrency.toUpperCase())) {
    throw new ApiError(400, `Invalid currency code. Supported: ${Array.from(ALLOWED_CURRENCIES).join(', ')}`);
  }

  // Manager/Admin Loan Sanction Gate
  if (loanStatus && ['sanctioned', 'disbursed'].includes(loanStatus)) {
    if (!isManagerOrAdmin) {
      throw new ApiError(
        403,
        'Only Branch Manager or Super Admin can mark loan status as sanctioned or disbursed'
      );
    }
  }

  const auditActions = [];

  if (annualBudget !== undefined) {
    const budget = Number(annualBudget);
    if (isNaN(budget) || budget < 0) {
      throw new ApiError(400, 'Annual budget must be a positive number');
    }
    student.financial.annualBudget = budget;
    auditActions.push('FINANCIAL_BUDGET_UPDATED');
  }

  if (budgetCurrency) {
    student.financial.budgetCurrency = budgetCurrency.toUpperCase().trim();
  }

  if (fundingSource) {
    student.financial.fundingSource = fundingSource;
  }

  if (loanStatus) {
    const previousStatus = student.financial.loanStatus;
    student.financial.loanStatus = loanStatus;
    if (previousStatus !== loanStatus && ['sanctioned', 'disbursed'].includes(loanStatus)) {
      auditActions.push('LOAN_SANCTION_UPDATED');
    }
  }

  if (loanAmount !== undefined) {
    const amount = Number(loanAmount);
    if (isNaN(amount) || amount < 0) {
      throw new ApiError(400, 'Loan amount must be a positive number');
    }
    student.financial.loanAmount = amount;
  }

  if (sponsorDetails && typeof sponsorDetails === 'object') {
    student.financial.sponsorDetails = {
      ...student.financial.sponsorDetails?.toObject?.() || {},
      ...sponsorDetails,
    };
  }

  if (visaRefusalHistory && typeof visaRefusalHistory === 'object') {
    student.financial.visaRefusalHistory = {
      ...student.financial.visaRefusalHistory?.toObject?.() || {},
      ...visaRefusalHistory,
    };
    auditActions.push('VISA_REFUSAL_UPDATED');
  }

  await student.save();

  // Audit events
  const actionsToLog = auditActions.length > 0 ? auditActions : ['FINANCIAL_BUDGET_UPDATED'];
  for (const act of actionsToLog) {
    await StudentAudit.create({
      student: student._id,
      studentIdCode: student.studentId,
      branch: student.branch,
      action: act,
      actor: req.user._id,
      actorName: req.user.name || 'Staff',
      actorRole: req.user.role || '',
      details: {
        annualBudget: student.financial.annualBudget,
        budgetCurrency: student.financial.budgetCurrency,
        loanStatus: student.financial.loanStatus,
        hasVisaRefusal: student.financial.visaRefusalHistory?.hasRefusal,
      },
    });
  }

  const maskedUpdated = applyRoleBasedMasking(student, req.user?.role);

  return res.status(200).json(
    new ApiResponse(200, { financial: maskedUpdated.financial }, 'Financial profile updated successfully')
  );
});

/**
 * Update Destination & Study Preferences
 * PATCH /api/v1/students/:id/preferences
 */
const updatePreferences = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    destinationCountries,
    targetDegrees,
    studyFields,
    targetIntakeYear,
    targetIntakeTerm,
    coachingRequired,
  } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid student ID format');
  }

  const student = await Student.findOne({ _id: id, isDeleted: false });
  if (!student) {
    throw new ApiError(404, 'Student profile not found');
  }

  // Branch containment guard
  if (
    req.user?.role !== ROLES.SUPER_ADMIN &&
    req.branchScope !== 'all' &&
    student.branch !== req.user?.branch
  ) {
    throw new ApiError(403, 'Unauthorized to modify student record outside your assigned branch');
  }

  if (destinationCountries && Array.isArray(destinationCountries)) {
    student.preferences.destinationCountries = destinationCountries.map((c) => String(c).trim());
  }
  if (targetDegrees && Array.isArray(targetDegrees)) {
    student.preferences.targetDegrees = targetDegrees.map((d) => String(d).trim());
  }
  if (studyFields && Array.isArray(studyFields)) {
    student.preferences.studyFields = studyFields.map((f) => String(f).trim());
  }
  if (targetIntakeYear !== undefined) {
    student.preferences.targetIntakeYear = Number(targetIntakeYear) || undefined;
  }
  if (targetIntakeTerm !== undefined) {
    student.preferences.targetIntakeTerm = String(targetIntakeTerm).trim();
  }
  if (coachingRequired !== undefined) {
    student.preferences.coachingRequired = Boolean(coachingRequired);
  }

  await student.save();

  // Audit event
  await StudentAudit.create({
    student: student._id,
    studentIdCode: student.studentId,
    branch: student.branch,
    action: 'PREFERENCES_UPDATED',
    actor: req.user._id,
    actorName: req.user.name || 'Staff',
    actorRole: req.user.role || '',
    details: { preferences: student.preferences },
  });

  return res.status(200).json(
    new ApiResponse(200, { preferences: student.preferences }, 'Preferences updated successfully')
  );
});

/**
 * Add Target University Application (Day 43)
 * POST /api/v1/students/:id/applications
 */
const addApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { universityName, programme, country, portalApplicationId, submittedDate, status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid student ID format');
  }

  if (!universityName || !programme || !country) {
    throw new ApiError(400, 'University name, programme, and country are required');
  }

  const student = await Student.findOne({ _id: id, isDeleted: false });
  if (!student) {
    throw new ApiError(404, 'Student profile not found');
  }

  // Branch containment guard
  if (
    req.user?.role !== ROLES.SUPER_ADMIN &&
    req.branchScope !== 'all' &&
    student.branch !== req.user?.branch
  ) {
    throw new ApiError(403, 'Unauthorized to modify student record outside your assigned branch');
  }

  const newApp = {
    universityName: universityName.trim(),
    programme: programme.trim(),
    country: country.trim(),
    portalApplicationId: portalApplicationId ? String(portalApplicationId).trim() : '',
    submittedDate: submittedDate ? new Date(submittedDate) : undefined,
    status: status || 'draft',
  };

  student.applications.push(newApp);
  await student.save();

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        applications: student.applications,
        addedApplication: student.applications[student.applications.length - 1],
      },
      'Application record added successfully'
    )
  );
});

/**
 * Update Target University Application (Day 43)
 * PATCH /api/v1/students/:id/applications/:appId
 */
const updateApplication = asyncHandler(async (req, res) => {
  const { id, appId } = req.params;
  const { status, portalApplicationId, offerLetterDate, casI20Number } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(appId)) {
    throw new ApiError(400, 'Invalid ID format');
  }

  const student = await Student.findOne({ _id: id, isDeleted: false });
  if (!student) {
    throw new ApiError(404, 'Student profile not found');
  }

  // Branch containment guard
  if (
    req.user?.role !== ROLES.SUPER_ADMIN &&
    req.branchScope !== 'all' &&
    student.branch !== req.user?.branch
  ) {
    throw new ApiError(403, 'Unauthorized to modify student record outside your assigned branch');
  }

  const appRecord = student.applications.id(appId);
  if (!appRecord) {
    throw new ApiError(404, 'Application not found on student profile');
  }

  if (status) appRecord.status = status;
  if (portalApplicationId !== undefined) appRecord.portalApplicationId = String(portalApplicationId).trim();
  if (offerLetterDate) appRecord.offerLetterDate = new Date(offerLetterDate);
  if (casI20Number !== undefined) appRecord.casI20Number = String(casI20Number).trim();

  await student.save();

  return res.status(200).json(
    new ApiResponse(200, { application: appRecord }, 'Application updated successfully')
  );
});

module.exports = {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  addStudentNote,
  convertLead,
  addAcademicRecord,
  addTestScore,
  verifyTestScore,
  updateFinancial,
  updatePreferences,
  addApplication,
  updateApplication,
  applyRoleBasedMasking,
  ALLOWED_STUDENT_LIST_FIELDS,
  SYSTEM_MANAGED_CREATION_FIELDS,
  IMMUTABLE_UPDATE_FIELDS,
};
