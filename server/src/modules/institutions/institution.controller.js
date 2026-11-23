const { Institution, INSTITUTION_TYPES, PARTNERSHIP_STATUSES } = require('./institution.model');
const { asyncHandler, ApiError, ApiResponse } = require('../../utils/devilWrapper');
const { ROLES, BRANCHES } = require('../../config/constants');

/**
 * List Institutions with Filtering, Search & Scoping
 * GET /api/v1/institutions
 */
const getInstitutions = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search = '',
    type,
    branch,
    city,
    partnership_status,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const query = {
    deletionStage: 'ACTIVE',
  };

  // Type filter (school, college, coaching_institute, university)
  if (type && type !== 'all') {
    query.institution_type = type;
  }

  // Branch filter (respect branch scope)
  if (req.user && req.user.role !== ROLES.SUPER_ADMIN && req.user.branch && req.user.branch !== BRANCHES.ALL) {
    query.branch = { $in: [req.user.branch, BRANCHES.ALL] };
  } else if (branch && branch !== 'all') {
    query.branch = branch;
  }

  // City filter
  if (city && city !== 'all') {
    query.city = city;
  }

  // Partnership status filter
  if (partnership_status && partnership_status !== 'all') {
    query.partnership_status = partnership_status;
  }

  // Search filter
  if (search && search.trim()) {
    const term = search.trim();
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    query.$or = [
      { name: regex },
      { city: regex },
      { 'contact_person.name': regex },
      { board_or_affiliation: regex },
      { category: regex },
    ];
  }

  // Pagination parameters
  const parsedLimit = parseInt(limit, 10);
  const safeLimit = isNaN(parsedLimit) || parsedLimit <= 0 ? 20 : Math.min(parsedLimit, 100);
  const parsedPage = parseInt(page, 10);
  const safePage = isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;
  const skip = (safePage - 1) * safeLimit;

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [institutions, total] = await Promise.all([
    Institution.find(query)
      .populate('createdBy', 'name email role')
      .sort(sort)
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Institution.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      message: 'Institutions retrieved successfully',
      institutions,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit) || 1,
      },
    })
  );
});

/**
 * Get Institution Statistics by Type and Partnerships
 * GET /api/v1/institutions/stats
 */
const getInstitutionStats = asyncHandler(async (req, res) => {
  const [
    total,
    totalSchools,
    totalColleges,
    totalCoaching,
    totalPartnerships,
  ] = await Promise.all([
    Institution.countDocuments({ deletionStage: 'ACTIVE' }),
    Institution.countDocuments({ deletionStage: 'ACTIVE', institution_type: 'school' }),
    Institution.countDocuments({ deletionStage: 'ACTIVE', institution_type: 'college' }),
    Institution.countDocuments({ deletionStage: 'ACTIVE', institution_type: 'coaching_institute' }),
    Institution.countDocuments({
      deletionStage: 'ACTIVE',
      partnership_status: { $in: ['Active MoU', 'Partner'] },
    }),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      stats: {
        total,
        totalSchools,
        totalColleges,
        totalCoaching,
        totalPartnerships,
      },
    })
  );
});

/**
 * Get Single Institution Record
 * GET /api/v1/institutions/:id
 */
const getInstitution = asyncHandler(async (req, res) => {
  const institution = await Institution.findById(req.params.id)
    .populate('createdBy', 'name email role')
    .lean();

  if (!institution || institution.deletionStage !== 'ACTIVE') {
    throw new ApiError(404, 'Institution record not found');
  }

  if (req.user && req.user.role !== ROLES.SUPER_ADMIN && req.user.branch && req.user.branch !== BRANCHES.ALL) {
    if (institution.branch !== req.user.branch && institution.branch !== BRANCHES.ALL) {
      throw new ApiError(403, `Branch access denied: You cannot access institutions in '${institution.branch}' branch.`);
    }
  }

  res.status(200).json(
    new ApiResponse(200, {
      message: 'Institution fetched successfully',
      institution,
    })
  );
});

/**
 * Create New School, College, or Coaching Institute
 * POST /api/v1/institutions
 */
const createInstitution = asyncHandler(async (req, res) => {
  const {
    name,
    institution_type,
    category,
    branch = BRANCHES.BENGALURU,
    board_or_affiliation,
    city,
    state = 'Karnataka',
    address,
    contact_person = {},
    official_email,
    official_phone,
    website,
    student_intake_capacity,
    target_destinations,
    partnership_status = 'Prospective',
    notes,
  } = req.body || {};

  if (!name || !name.trim()) {
    throw new ApiError(400, 'Institution name is required');
  }

  if (!institution_type || !INSTITUTION_TYPES.includes(institution_type)) {
    throw new ApiError(
      400,
      `Invalid institution type. Permitted: ${INSTITUTION_TYPES.join(', ')}`
    );
  }

  if (!city || !city.trim()) {
    throw new ApiError(400, 'City is required');
  }

  const cleanName = name.trim();

  // Branch isolation: Confine non-super-admins to their assigned branch
  let allocatedBranch = branch || BRANCHES.BENGALURU;
  if (req.user && req.user.role !== ROLES.SUPER_ADMIN && req.user.branch && req.user.branch !== BRANCHES.ALL) {
    if (branch && branch !== req.user.branch && branch !== BRANCHES.ALL) {
      throw new ApiError(403, `Branch access denied: You cannot create institutions in '${branch}' branch.`);
    }
    allocatedBranch = req.user.branch;
  }

  // Check duplicate name
  const existing = await Institution.findOne({
    name: new RegExp(`^${cleanName}$`, 'i'),
    deletionStage: 'ACTIVE',
  });

  if (existing) {
    throw new ApiError(
      409,
      `An institution with the name "${cleanName}" already exists (${existing.city}, Type: ${existing.institution_type})`
    );
  }

  const institution = await Institution.create({
    name: cleanName,
    institution_type,
    category: category ? category.trim() : '',
    branch: allocatedBranch,
    board_or_affiliation: board_or_affiliation ? board_or_affiliation.trim() : '',
    city: city.trim(),
    state: state ? state.trim() : 'Karnataka',
    address: address ? address.trim() : '',
    contact_person: {
      name: contact_person.name ? contact_person.name.trim() : '',
      designation: contact_person.designation ? contact_person.designation.trim() : '',
      phone: contact_person.phone ? contact_person.phone.trim() : '',
      email: contact_person.email ? contact_person.email.trim().toLowerCase() : '',
    },
    official_email: official_email ? official_email.trim().toLowerCase() : '',
    official_phone: official_phone ? official_phone.trim() : '',
    website: website ? website.trim() : '',
    student_intake_capacity: student_intake_capacity ? String(student_intake_capacity).trim() : '',
    target_destinations: Array.isArray(target_destinations) && target_destinations.length > 0
      ? target_destinations
      : ['United Kingdom', 'United States', 'Canada', 'Australia', 'Germany', 'Ireland'],
    partnership_status,
    notes: notes ? notes.trim() : '',
    createdBy: req.user?._id || null,
  });

  res.status(201).json(
    new ApiResponse(201, {
      message: `${institution_type.replace('_', ' ').toUpperCase()} "${cleanName}" added successfully`,
      institution,
    })
  );
});

/**
 * Update Institution Record
 * PUT /api/v1/institutions/:id
 */
const updateInstitution = asyncHandler(async (req, res) => {
  const institution = await Institution.findById(req.params.id);
  if (!institution || institution.deletionStage !== 'ACTIVE') {
    throw new ApiError(404, 'Institution record not found');
  }

  if (req.user && req.user.role !== ROLES.SUPER_ADMIN && req.user.branch && req.user.branch !== BRANCHES.ALL) {
    if (institution.branch !== req.user.branch && institution.branch !== BRANCHES.ALL) {
      throw new ApiError(403, `Branch access denied: You cannot access institutions in '${institution.branch}' branch.`);
    }
  }

  const allowedUpdates = [
    'name',
    'institution_type',
    'category',
    'branch',
    'board_or_affiliation',
    'city',
    'state',
    'address',
    'contact_person',
    'official_email',
    'official_phone',
    'website',
    'student_intake_capacity',
    'target_destinations',
    'partnership_status',
    'notes',
  ];

  for (const field of allowedUpdates) {
    if (req.body[field] !== undefined) {
      institution[field] = req.body[field];
    }
  }

  await institution.save();

  res.status(200).json(
    new ApiResponse(200, {
      message: 'Institution updated successfully',
      institution,
    })
  );
});

/**
 * Soft Delete Institution
 * DELETE /api/v1/institutions/:id
 */
const deleteInstitution = asyncHandler(async (req, res) => {
  const institution = await Institution.findById(req.params.id);
  if (!institution) {
    throw new ApiError(404, 'Institution record not found');
  }

  if (req.user && req.user.role !== ROLES.SUPER_ADMIN && req.user.branch && req.user.branch !== BRANCHES.ALL) {
    if (institution.branch !== req.user.branch && institution.branch !== BRANCHES.ALL) {
      throw new ApiError(403, `Branch access denied: You cannot delete institutions in '${institution.branch}' branch.`);
    }
  }

  institution.deletionStage = 'TRASH';
  await institution.save();

  res.status(200).json(
    new ApiResponse(200, {
      message: 'Institution moved to trash successfully',
    })
  );
});

module.exports = {
  getInstitutions,
  getInstitutionStats,
  getInstitution,
  createInstitution,
  updateInstitution,
  deleteInstitution,
};
