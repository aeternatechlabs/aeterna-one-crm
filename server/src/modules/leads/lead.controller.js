const { Lead, LEAD_STATUSES, PRIORITY_LEVELS } = require('./lead.model');
const PipelineStudent = require('../pipeline/pipeline.model');
const User = require('../users/user.model');
const Task = require('../tasks/task.model');
const { Institution } = require('../institutions/institution.model');
const { convertLeadToStudent } = require('../students/studentConversion.service');
const { createIdempotentNotification } = require('../notifications/notification.service');
const { NOTIFICATION_TYPES } = require('../notifications/notification.model');
const { asyncHandler, ApiError, ApiResponse } = require('../../utils/devilWrapper');
const { ROLES, BRANCHES, PIPELINE_STAGES, TASK_TYPES, TASK_PRIORITIES, TASK_STATUSES } = require('../../config/constants');

/**
 * Branch Access Authorization Guard (SEC-AUD-01)
 */
function checkLeadBranchAccess(user, lead) {
  if (!user || user.role === ROLES.SUPER_ADMIN || user.branch === BRANCHES.ALL) return;
  if (lead.branch !== user.branch && lead.branch !== BRANCHES.ALL) {
    throw new ApiError(403, `Branch access denied: You cannot access leads in '${lead.branch}' branch.`);
  }
}

/**
 * Normalize phone number for consistent deduplication
 */
const normalizePhone = (phone) => {
  if (!phone) return '';
  return String(phone).replace(/[^\d+]/g, '').trim();
};

/**
 * List Leads with Filtering, Search & Scoping
 * GET /api/v1/leads
 */
const getLeads = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search = '',
    status,
    priority,
    branch,
    department,
    assigned_to,
    follow_up_view = 'all',
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const query = {
    deletionStage: 'ACTIVE',
  };

  // Branch Scoping (Role 2 / Rule 19)
  if (req.user && req.user.role !== ROLES.SUPER_ADMIN && req.user.branch && req.user.branch !== BRANCHES.ALL) {
    query.branch = req.user.branch;
  } else if (branch && branch !== 'all') {
    query.branch = branch;
  }

  // Counsellor Self-Scoping (if counsellor requests only their leads)
  if (req.user && req.user.role === ROLES.COUNSELLOR && assigned_to === 'me') {
    query.assigned_to = req.user._id;
  } else if (assigned_to && assigned_to !== 'all' && assigned_to !== 'me') {
    query.assigned_to = assigned_to;
  }

  // Status Filter
  if (status && status !== 'all') {
    query.current_status = status;
  }

  // Priority Filter
  if (priority && priority !== 'all') {
    query.priority = priority;
  }

  // Department Filter
  if (department && department !== 'all') {
    query.department = department;
  }

  // Follow-up quick filters (today, overdue, upcoming)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  if (follow_up_view === 'today') {
    query.follow_up_date = { $gte: todayStart, $lte: todayEnd };
  } else if (follow_up_view === 'overdue') {
    query.follow_up_date = { $lt: todayStart };
    query.current_status = { $nin: ['Deal Closed', 'Not Interested'] };
  } else if (follow_up_view === 'new') {
    query.current_status = 'New';
  }

  // Search Filter
  if (search && search.trim()) {
    const term = search.trim();
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    query.$or = [
      { name: regex },
      { phone_number: regex },
      { email: regex },
      { destination_country: regex },
    ];
  }

  // Pagination parameters (LIMIT = 20 as in reference project)
  const parsedLimit = parseInt(limit, 10);
  const safeLimit = isNaN(parsedLimit) || parsedLimit <= 0 ? 20 : Math.min(parsedLimit, 100);
  const parsedPage = parseInt(page, 10);
  const safePage = isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;
  const skip = (safePage - 1) * safeLimit;

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [total, leads, statsAgg] = await Promise.all([
    Lead.countDocuments(query),
    Lead.find(query)
      .populate('assigned_to', 'name email role branch')
      .populate('created_by', 'name email')
      .populate('converted_to_student', 'studentName stage branch')
      .populate('institution_id', 'name city institution_type')
      .sort(sort)
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Lead.aggregate([
      { $match: { deletionStage: 'ACTIVE', ...(query.branch ? { branch: query.branch } : {}) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          newCount: { $sum: { $cond: [{ $eq: ['$current_status', 'New'] }, 1, 0] } },
          interestedCount: { $sum: { $cond: [{ $eq: ['$current_status', 'Interested'] }, 1, 0] } },
          followUpCount: { $sum: { $cond: [{ $eq: ['$current_status', 'Follow Up'] }, 1, 0] } },
          dealClosedCount: { $sum: { $cond: [{ $eq: ['$current_status', 'Deal Closed'] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const totalPages = Math.ceil(total / safeLimit) || 1;
  const agg = statsAgg[0] || {};

  res.status(200).json(
    new ApiResponse(200, {
      leads,
      pagination: {
        currentPage: safePage,
        page: safePage,
        totalPages,
        pages: totalPages,
        totalItems: total,
        total,
        pageSize: safeLimit,
        limit: safeLimit,
        hasNextPage: safePage < totalPages,
        hasPreviousPage: safePage > 1,
      },
      stats: {
        total: agg.total || total,
        new: agg.newCount || 0,
        interested: agg.interestedCount || 0,
        follow_up: agg.followUpCount || 0,
        deal_closed: agg.dealClosedCount || 0,
      },
    })
  );
});

/**
 * Get Lead Metrics & Follow-up Counts
 * GET /api/v1/leads/stats
 */
const getLeadStats = asyncHandler(async (req, res) => {
  const branchQuery = req.user?.role !== ROLES.SUPER_ADMIN && req.user?.branch && req.user?.branch !== BRANCHES.ALL
    ? { branch: req.user.branch }
    : {};

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [totalActive, todayFollowups, overdueFollowups, newLeads] = await Promise.all([
    Lead.countDocuments({ deletionStage: 'ACTIVE', ...branchQuery }),
    Lead.countDocuments({ deletionStage: 'ACTIVE', ...branchQuery, follow_up_date: { $gte: todayStart, $lte: todayEnd } }),
    Lead.countDocuments({ deletionStage: 'ACTIVE', ...branchQuery, follow_up_date: { $lt: todayStart }, current_status: { $nin: ['Deal Closed', 'Not Interested'] } }),
    Lead.countDocuments({ deletionStage: 'ACTIVE', ...branchQuery, current_status: 'New' }),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      totalActive,
      todayFollowups,
      overdueFollowups,
      newLeads,
    })
  );
});

/**
 * Get Single Lead by ID
 * GET /api/v1/leads/:id
 */
const getLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id)
    .populate('assigned_to', 'name email role branch phone')
    .populate('created_by', 'name email role')
    .populate('converted_to_student')
    .populate('institution_id', 'name city institution_type official_email official_phone');

  if (!lead || lead.deletionStage !== 'ACTIVE') {
    throw new ApiError(404, 'Lead record not found');
  }

  checkLeadBranchAccess(req.user, lead);

  res.status(200).json(new ApiResponse(200, { lead }));
});

/**
 * Create Lead with Phone Deduplication
 * POST /api/v1/leads
 */
const createLead = asyncHandler(async (req, res) => {
  const {
    name,
    phone_number,
    email = '',
    branch,
    department = 'Overseas Counselling',
    destination_country = 'United Kingdom',
    study_level = "Master's",
    intake_target = 'Fall 2026',
    institution_id = null,
    institution_name = '',
    notes = '',
    priority = 'medium',
    assigned_to = null,
    source = 'manual',
    follow_up_date,
    follow_up_time = '',
  } = req.body;

  if (!name || !name.trim()) {
    throw new ApiError(400, 'Lead name is required');
  }

  if (!phone_number || !String(phone_number).trim()) {
    throw new ApiError(400, 'Phone number is required');
  }

  const normalizedPhone = normalizePhone(phone_number);

  // Deduplication check
  const existingLead = await Lead.findOne({
    phone_number: normalizedPhone,
    deletionStage: 'ACTIVE',
  }).select('_id name phone_number assigned_to current_status').populate('assigned_to', 'name');

  if (existingLead) {
    throw new ApiError(
      409,
      `Lead with phone ${normalizedPhone} already exists (${existingLead.name}, Status: ${existingLead.current_status})`
    );
  }

  const allocatedBranch = req.user?.role !== ROLES.SUPER_ADMIN && req.user?.branch && req.user?.branch !== BRANCHES.ALL
    ? req.user.branch
    : branch || BRANCHES.BENGALURU;

  // Resolve institution name if institution_id is provided
  let instName = institution_name ? institution_name.trim() : '';
  if (institution_id && !instName) {
    const inst = await Institution.findById(institution_id).select('name');
    if (inst) instName = inst.name;
  }

  const lead = await Lead.create({
    name: name.trim(),
    phone_number: normalizedPhone,
    email: email.trim().toLowerCase(),
    branch: allocatedBranch,
    department: department.trim(),
    destination_country: destination_country.trim(),
    study_level,
    intake_target: intake_target.trim(),
    institution_id: institution_id || null,
    institution_name: instName,
    notes: notes.trim(),
    priority,
    current_status: assigned_to ? 'Assigned' : 'New',
    assigned_to: assigned_to || null,
    assigned_by: assigned_to ? req.user?._id : null,
    assigned_at: assigned_to ? new Date() : null,
    source,
    follow_up_date: follow_up_date ? new Date(follow_up_date) : null,
    follow_up_time,
    created_by: req.user?._id || null,
  });

  res.status(201).json(
    new ApiResponse(201, {
      message: 'Lead created successfully',
      lead,
    })
  );
});

/**
 * Update Lead
 * PUT /api/v1/leads/:id
 */
const updateLead = asyncHandler(async (req, res) => {
  const allowedUpdates = [
    'name',
    'phone_number',
    'email',
    'branch',
    'department',
    'destination_country',
    'study_level',
    'intake_target',
    'institution_id',
    'institution_name',
    'notes',
    'priority',
    'current_status',
    'follow_up_date',
    'follow_up_time',
    'assigned_to',
  ];

  const lead = await Lead.findById(req.params.id);
  if (!lead || lead.deletionStage !== 'ACTIVE') {
    throw new ApiError(404, 'Lead record not found');
  }

  // Branch Access Guard (SEC-AUD-01)
  checkLeadBranchAccess(req.user, lead);

  const updates = {};
  for (const field of allowedUpdates) {
    if (req.body[field] !== undefined) {
      if (field === 'phone_number') {
        updates[field] = normalizePhone(req.body[field]);
      } else if (field === 'follow_up_date') {
        updates[field] = req.body[field] ? new Date(req.body[field]) : null;
      } else {
        updates[field] = req.body[field];
      }
    }
  }

  // If institution_id updated without name, look up name
  if (updates.institution_id && !updates.institution_name) {
    const inst = await Institution.findById(updates.institution_id).select('name');
    if (inst) updates.institution_name = inst.name;
  }

  // If assigned_to changed, record assign metadata
  if (updates.assigned_to && String(updates.assigned_to) !== String(lead.assigned_to)) {
    updates.assigned_by = req.user?._id;
    updates.assigned_at = new Date();
    if (lead.current_status === 'New') {
      updates.current_status = 'Assigned';
    }
  }

  Object.assign(lead, updates);
  await lead.save();

  res.status(200).json(
    new ApiResponse(200, {
      message: 'Lead updated successfully',
      lead,
    })
  );
});

/**
 * Update Lead Status Quick Action
 * PATCH /api/v1/leads/:id/status
 */
const updateLeadStatus = asyncHandler(async (req, res) => {
  const { status, notes, follow_up_date, follow_up_time } = req.body;

  if (!status || !LEAD_STATUSES.includes(status)) {
    throw new ApiError(400, `Invalid status. Permitted statuses: ${LEAD_STATUSES.join(', ')}`);
  }

  const lead = await Lead.findById(req.params.id);
  if (!lead || lead.deletionStage !== 'ACTIVE') {
    throw new ApiError(404, 'Lead record not found');
  }

  // Branch Access Guard (SEC-AUD-01)
  checkLeadBranchAccess(req.user, lead);

  lead.current_status = status;
  lead.total_call_attempts = (lead.total_call_attempts || 0) + 1;
  lead.last_call_date = new Date();

  if (notes) {
    lead.notes = lead.notes ? `${lead.notes}\n[${new Date().toLocaleDateString('en-IN')}] ${notes}` : notes;
  }

  if (follow_up_date) {
    lead.follow_up_date = new Date(follow_up_date);
  }
  if (follow_up_time !== undefined) {
    lead.follow_up_time = follow_up_time;
  }

  await lead.save();

  res.status(200).json(
    new ApiResponse(200, {
      message: `Lead status updated to ${status}`,
      lead,
    })
  );
});

/**
 * 1-Click Convert Lead to Admissions Pipeline & Student 360 (GAP-02)
 * POST /api/v1/leads/:id/convert
 */
const convertToStudent = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead || lead.deletionStage !== 'ACTIVE') {
    throw new ApiError(404, 'Lead record not found');
  }

  // Branch Access Guard (SEC-AUD-01)
  checkLeadBranchAccess(req.user, lead);

  if (lead.converted_to_student) {
    throw new ApiError(400, 'Lead has already been converted to an admissions pipeline candidate.');
  }

  // 1. Create Admissions Pipeline Candidate
  const candidateBranch = [BRANCHES.BENGALURU, BRANCHES.MYSURU, BRANCHES.BELAGAVI].includes(lead.branch)
    ? lead.branch
    : BRANCHES.BENGALURU;

  const pipelineStudent = await PipelineStudent.create({
    studentName: lead.name,
    email: lead.email || `${lead.phone_number.replace(/\+/g, '')}@student.aeterna.com`,
    phone: lead.phone_number,
    programme: lead.study_level ? `${lead.study_level} in Applied Sciences` : "Master's Programme",
    university: 'Target University Selection',
    destination: lead.destination_country || 'United Kingdom',
    intake: lead.intake_target || 'Fall 2026',
    branch: candidateBranch,
    stage: PIPELINE_STAGES.NEW,
    assignedCounsellor: lead.assigned_to ? String(lead.assigned_to) : (req.user ? String(req.user._id) : undefined),
  });

  // 2. Automatically Create Comprehensive Student 360° Profile
  let studentProfile = null;
  try {
    const studentResult = await convertLeadToStudent({
      lead: pipelineStudent,
      user: req.user,
      conversionNotes: `Directly converted from Lead: ${lead.name} (${lead.phone_number}). Destination: ${lead.destination_country || 'United Kingdom'}.`,
      additionalProfileData: {
        institution_id: lead.institution_id || undefined,
        institution_name: lead.institution_name || undefined,
      },
    });
    if (studentResult.success && studentResult.student) {
      studentProfile = studentResult.student;
    }
  } catch (convErr) {
    console.warn('Student 360 profile auto-conversion notice:', convErr.message);
  }

  // 3. Automatically Create Onboarding Follow-Up Task (48h SLA)
  let onboardingTask = null;
  const staffAssignee = lead.assigned_to || req.user?._id;
  try {
    onboardingTask = await Task.create({
      title: `Initial Onboarding Consultation: ${lead.name}`,
      description: `New candidate converted from Lead Management. Conduct discovery consultation, verify academic documents, and establish application roadmap for ${lead.destination_country || 'study abroad'}.`,
      taskType: TASK_TYPES.COUNSELLING_SCHEDULED,
      priority: TASK_PRIORITIES.HIGH,
      status: TASK_STATUSES.PENDING,
      dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48-hour SLA deadline
      assignedTo: staffAssignee,
      assignedBy: req.user?._id,
      branch: candidateBranch,
      leadId: pipelineStudent._id,
      studentId: studentProfile ? studentProfile._id : null,
      candidateName: lead.name,
      candidatePhone: lead.phone_number,
      candidateEmail: lead.email || '',
    });
  } catch (taskErr) {
    console.warn('Onboarding task auto-creation notice:', taskErr.message);
  }

  // 4. Dispatch In-App Notification (GAP-04)
  try {
    if (staffAssignee) {
      await createIdempotentNotification({
        recipient: staffAssignee,
        recipientRole: req.user?.role || ROLES.COUNSELLOR,
        branch: candidateBranch,
        type: NOTIFICATION_TYPES.TASK_ASSIGNED,
        title: `New Student Onboarding: ${lead.name}`,
        message: `Lead ${lead.name} has been enrolled into admissions pipeline. Onboarding task assigned with 48h SLA.`,
        taskId: onboardingTask ? onboardingTask._id : null,
        leadId: pipelineStudent._id,
        studentId: studentProfile ? studentProfile._id : null,
        actionLink: '/tasks',
        dedupKey: `lead-convert-${lead._id}`,
      });
    }
  } catch (notifErr) {
    console.warn('Onboarding notification notice:', notifErr.message);
  }

  lead.converted_to_student = pipelineStudent._id;
  lead.converted_at = new Date();
  lead.current_status = 'Deal Closed';
  await lead.save();

  res.status(200).json(
    new ApiResponse(200, {
      message: `Lead successfully converted to pipeline candidate ${pipelineStudent.studentName}`,
      pipelineStudent,
      studentProfile,
      onboardingTask,
      lead,
    })
  );
});

/**
 * Soft Delete Lead
 * DELETE /api/v1/leads/:id
 */
const deleteLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    throw new ApiError(404, 'Lead record not found');
  }

  // Branch Access Guard (SEC-AUD-01)
  checkLeadBranchAccess(req.user, lead);

  lead.deletionStage = 'TRASH';
  await lead.save();

  res.status(200).json(
    new ApiResponse(200, {
      message: `Lead ${lead.name} moved to trash`,
    })
  );
});

module.exports = {
  getLeads,
  getLeadStats,
  getLead,
  createLead,
  updateLead,
  updateLeadStatus,
  convertToStudent,
  deleteLead,
};
