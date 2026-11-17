const PipelineStudent = require('./pipeline.model');
const { asyncHandler, ApiError, ApiResponse } = require('../../utils/devilWrapper');
const { PIPELINE_STAGES, BRANCHES, ROLES } = require('../../config/constants');



const ALLOWED_PIPELINE_FIELDS = new Set([
  '_id',
  'studentName',
  'email',
  'programme',
  'destination',
  'branch',
  'stage',
  'documentsVerified',
  'targetUniversity',
  'university',
  'intake',
  'phone',
  'notes',
  'sopStatus',
  'counsellorName',
  'createdAt',
  'updatedAt',
]);

/**
 * Get Admissions Pipeline students
 * GET /api/v1/pipeline
 */
const getPipeline = asyncHandler(async (req, res) => {
  const { branch, stage, search, fields, page = 1, limit = 100 } = req.query;
  const filter = {};

  // Branch isolation
  if (req.branchScope && req.branchScope !== 'all') {
    filter.branch = req.branchScope;
  } else if (branch && branch !== 'all') {
    filter.branch = branch;
  }

  // Stage filter
  if (stage) {
    filter.stage = stage;
  }

  // Search filter (SEC-06 & F-08: length bounds, regex syntax validation, and escaping)
  if (search && search.trim()) {
    const term = search.trim();
    if (term.length > 50) {
      throw new ApiError(400, 'Search query cannot exceed 50 characters.');
    }
    try {
      new RegExp(term);
    } catch {
      throw new ApiError(400, 'Invalid search query pattern');
    }
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { studentName: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
      { programme: { $regex: escaped, $options: 'i' } },
      { university: { $regex: escaped, $options: 'i' } },
      { destination: { $regex: escaped, $options: 'i' } },
    ];
  }

  // SEC-06: Sanitize and cap pagination bounds to prevent resource exhaustion
  const parsedLimit = parseInt(limit, 10);
  const safeLimit = isNaN(parsedLimit) || parsedLimit <= 0 ? 100 : Math.min(parsedLimit, 100);

  const parsedPage = parseInt(page, 10);
  const safePage = isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;
  const skip = (safePage - 1) * safeLimit;

  let query = PipelineStudent.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(safeLimit);

  // Minimal response mapping & payload minimization (Rule 18 & Rule 20, F-06 allowlist)
  if (fields) {
    const requested = fields
      .split(',')
      .map((f) => f.trim())
      .filter((f) => ALLOWED_PIPELINE_FIELDS.has(f));
    const projection =
      requested.length > 0
        ? requested.join(' ')
        : '_id';
    query = query.select(projection);
  } else {
    // Send only necessary candidate card fields for pipeline board (defer deep stageHistory audit log)
    query = query.select('-stageHistory -__v');
  }

  const students = await query.lean();

  res.status(200).json(
    new ApiResponse(200, {
      message: 'Admissions pipeline fetched successfully',
      students,
      total: students.length,
    })
  );
});

/**
 * Update student pipeline stage
 * PATCH /api/v1/pipeline/:id/stage
 * SEC-07: Concurrency-hardened with atomic conditional database updates.
 * Prevents race conditions on document verification checks and concurrent conflicting transitions.
 */
const updateStage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { stage, reason, simulateError, expectedStage } = req.body;

  // Header or body simulation flag for testing validation rollback
  const simulateFail =
    req.headers['x-simulate-validation-error'] === 'true' ||
    simulateError === true;

  if (simulateFail) {
    throw new ApiError(
      400,
      'Stage transition rejected: Simulated validation error (backend constraint failed). Changes have been rolled back.'
    );
  }

  // Verify valid target stage
  if (!stage || !Object.values(PIPELINE_STAGES).includes(stage)) {
    throw new ApiError(400, `Invalid target stage: ${stage}`);
  }

  // Business validation 2: Moving to Lost requires a stated reason
  if (stage === PIPELINE_STAGES.LOST && (!reason || reason.trim().length < 5)) {
    throw new ApiError(
      400,
      'Cannot mark as Lost / Deferred: A detailed reason (minimum 5 characters) must be documented.'
    );
  }

  const student = await PipelineStudent.findById(id);
  if (!student) {
    throw new ApiError(404, 'Student pipeline record not found');
  }

  // Branch access authorization check
  if (
    req.user?.role !== ROLES.SUPER_ADMIN &&
    req.branchScope !== 'all' &&
    student.branch !== req.user?.branch
  ) {
    throw new ApiError(403, 'Unauthorized to modify student from another branch');
  }

  // Business validation 1: Moving to Application Submitted requires verified documents
  if (stage === PIPELINE_STAGES.APPLICATION_SUBMITTED && !student.documentsVerified) {
    throw new ApiError(
      400,
      `Cannot move ${student.studentName} to 'Application Submitted': Academic transcripts & passport verification are pending.`
    );
  }

  const previousStage = student.stage;
  const targetExpectedStage = expectedStage || previousStage;

  // SEC-07: Atomic conditional update filter
  // 1. Matches student _id
  // 2. Optimistic concurrency: matches expected/read current stage to prevent concurrent conflicting overwrites
  // 3. If transitioning to APPLICATION_SUBMITTED, atomically guarantees documentsVerified is true in DB at commit time
  const atomicFilter = {
    _id: id,
    stage: targetExpectedStage,
    ...(stage === PIPELINE_STAGES.APPLICATION_SUBMITTED ? { documentsVerified: true } : {}),
  };

  const historyEntry = {
    fromStage: previousStage,
    toStage: stage,
    changedAt: new Date(),
    changedBy: req.user?._id,
    reason: reason || `Stage moved from ${previousStage} to ${stage}`,
  };

  const updatedStudent = await PipelineStudent.findOneAndUpdate(
    atomicFilter,
    {
      $set: { stage },
      $push: { stageHistory: historyEntry },
    },
    { new: true, runValidators: true }
  );

  // If update matched nothing, detect root cause: stage conflict vs unverified documents vs deleted
  if (!updatedStudent) {
    const freshRecord = await PipelineStudent.findById(id);
    if (!freshRecord) {
      throw new ApiError(404, 'Student pipeline record not found');
    }

    if (stage === PIPELINE_STAGES.APPLICATION_SUBMITTED && !freshRecord.documentsVerified) {
      throw new ApiError(
        400,
        `Cannot move ${freshRecord.studentName} to 'Application Submitted': Academic transcripts & passport verification are pending.`
      );
    }

    if (freshRecord.stage !== targetExpectedStage) {
      throw new ApiError(
        409,
        `Pipeline stage transition conflict: The student stage was concurrently modified to '${freshRecord.stage}'. Please refresh and retry.`
      );
    }

    throw new ApiError(409, 'Pipeline stage transition conflict: Could not apply atomic stage update. Please refresh.');
  }

  res.status(200).json(
    new ApiResponse(200, {
      message: `Student successfully moved to ${stage}`,
      student: updatedStudent,
    })
  );
});

/**
 * Toggle document verification status (for testing and counsellor workflow)
 * PATCH /api/v1/pipeline/:id/documents
 * SEC-07: Atomic update prevents overwriting concurrent stage updates or stageHistory audit logs.
 */
const toggleDocumentsVerified = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { documentsVerified } = req.body;

  const student = await PipelineStudent.findById(id);
  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  // Record-level branch access authorization check
  if (
    req.user?.role !== ROLES.SUPER_ADMIN &&
    req.branchScope !== 'all' &&
    student.branch !== req.user?.branch
  ) {
    throw new ApiError(403, 'Unauthorized to modify student records outside your assigned branch.');
  }

  const targetStatus =
    typeof documentsVerified === 'boolean'
      ? documentsVerified
      : !student.documentsVerified;

  // SEC-07: Atomic update using findOneAndUpdate to prevent overwriting concurrent stage or history changes
  const updatedStudent = await PipelineStudent.findOneAndUpdate(
    { _id: id },
    { $set: { documentsVerified: targetStatus } },
    { new: true, runValidators: true }
  );

  if (!updatedStudent) {
    throw new ApiError(404, 'Student not found');
  }

  res.status(200).json(
    new ApiResponse(200, {
      message: `Document status updated to ${updatedStudent.documentsVerified ? 'Verified' : 'Unverified'}`,
      student: updatedStudent,
    })
  );
});

/**
 * Create a new student enquiry in pipeline
 * POST /api/v1/pipeline
 */
const createStudent = asyncHandler(async (req, res) => {
  const {
    studentName,
    email,
    phone,
    programme,
    university,
    destination,
    intake,
    branch,
    notes,
  } = req.body;

  if (!studentName || !email || !programme || !destination) {
    throw new ApiError(400, 'Name, email, programme, and destination are required.');
  }

  const studentBranch =
    req.user?.role === ROLES.SUPER_ADMIN && branch
      ? branch
      : req.user?.branch || BRANCHES.BENGALURU;

  const newStudent = await PipelineStudent.create({
    studentName,
    email,
    phone,
    programme,
    university,
    destination,
    intake: intake || 'Fall 2026',
    branch: studentBranch,
    stage: PIPELINE_STAGES.NEW_ENQUIRY,
    counsellor: req.user?._id,
    counsellorName: req.user?.name || 'Assigned Counsellor',
    notes,
  });

  res.status(201).json(
    new ApiResponse(201, {
      message: 'Student enquiry added to pipeline',
      student: newStudent,
    })
  );
});

module.exports = {
  getPipeline,
  updateStage,
  toggleDocumentsVerified,
  createStudent,
};
