const crypto = require('crypto');
const Employee = require('./employee.model');
const User = require('../users/user.model');
const { asyncHandler, ApiError, ApiResponse } = require('../../utils/devilWrapper');
const { ROLES, BRANCHES } = require('../../config/constants');
const { validatePasswordComplexity } = require('../../utils/passwordPolicy');

/**
 * Generates a cryptographically strong, unique temporary password that strictly meets
 * the unified password policy:
 * - 16 characters long
 * - Minimum 2 uppercase letters
 * - Minimum 2 digits
 * - Minimum 2 special characters
 * - Minimum 2 lowercase letters
 * - Remaining 8 positions filled from full character pool and Fisher-Yates shuffled
 */
function generateSecureTemporaryPassword() {
  const upperPool = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowerPool = 'abcdefghijkmnopqrstuvwxyz';
  const digitPool = '23456789';
  const specialPool = '!@#$%^&*()_+-=';
  const allPool = upperPool + lowerPool + digitPool + specialPool;

  const chars = [
    upperPool[crypto.randomInt(0, upperPool.length)],
    upperPool[crypto.randomInt(0, upperPool.length)],
    lowerPool[crypto.randomInt(0, lowerPool.length)],
    lowerPool[crypto.randomInt(0, lowerPool.length)],
    digitPool[crypto.randomInt(0, digitPool.length)],
    digitPool[crypto.randomInt(0, digitPool.length)],
    specialPool[crypto.randomInt(0, specialPool.length)],
    specialPool[crypto.randomInt(0, specialPool.length)],
  ];

  for (let i = 0; i < 8; i++) {
    chars.push(allPool[crypto.randomInt(0, allPool.length)]);
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

const DELETION_STAGES = {
  ACTIVE: 'ACTIVE',
  TRASH: 'TRASH',
  DELETED: 'DELETED',
};

const ALLOWED_EMPLOYEE_FIELDS = [
  'first_name',
  'last_name',
  'employee_code',
  'email',
  'department',
  'designation',
  'branch',
  'role',
  'joining_date',
  'employment_status',
  'contact_info',
  'user_id',
  'manager_id',
  'profile_photo',
  'deletionStage',
  'deleteReason',
  'deletedAt',
  'deletedBy',
  'createdAt',
  'updatedAt',
];

/**
 * List Employees (Staff Directory)
 * GET /api/v1/employees
 */
const getEmployees = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    department,
    designation,
    branch,
    role,
    employment_status,
    view = 'active',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    fields,
  } = req.query;

  const query = {};

  // Stage filtering
  if (view === 'trash') {
    query.deletionStage = DELETION_STAGES.TRASH;
  } else if (view === 'all') {
    query.deletionStage = { $in: [DELETION_STAGES.ACTIVE, DELETION_STAGES.TRASH] };
  } else {
    query.deletionStage = DELETION_STAGES.ACTIVE;
  }

  // Branch filtering (respect branchScope if present)
  if (req.branchScope && req.branchScope !== BRANCHES.ALL) {
    query.branch = req.branchScope;
  } else if (branch && branch !== BRANCHES.ALL && branch !== 'all') {
    query.branch = branch;
  }

  // Role filtering
  if (role && role !== 'all') {
    query.role = role;
  }

  // Department filtering
  if (department && department !== 'all') {
    query.department = department;
  }

  // Designation filtering
  if (designation && designation !== 'all') {
    query.designation = designation;
  }

  // Employment status filtering
  if (employment_status && employment_status !== 'all') {
    query.employment_status = employment_status;
  }

  // Search by name, code, email, or phone
  if (search && search.trim()) {
    const term = search.trim();
    if (term.length > 50) {
      throw new ApiError(400, 'Search query cannot exceed 50 characters.');
    }
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    query.$or = [
      { first_name: regex },
      { last_name: regex },
      { employee_code: regex },
      { email: regex },
      { 'contact_info.phone': regex },
    ];
  }

  // Pagination parameters
  const parsedLimit = parseInt(limit, 10);
  const safeLimit = isNaN(parsedLimit) || parsedLimit <= 0 ? 10 : Math.min(parsedLimit, 100);
  const parsedPage = parseInt(page, 10);
  const safePage = isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;
  const skip = (safePage - 1) * safeLimit;

  // Sorting
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  // Rule 18 & Rule 20: Minimal Response Mapping & Data Minimization
  let selectFields;
  let shouldPopulate = true;
  if (fields) {
    const requested = fields
      .split(',')
      .map((f) => f.trim())
      .filter((f) => ALLOWED_EMPLOYEE_FIELDS.includes(f));
    selectFields = requested.length > 0 ? requested.join(' ') : '-__v';
    // Skip heavy population if relations are not in requested projection
    shouldPopulate = requested.includes('user_id') || requested.includes('manager_id') || requested.includes('deletedBy');
  } else {
    selectFields = '-__v';
  }

  let dbQuery = Employee.find(query).select(selectFields).sort(sort).skip(skip).limit(safeLimit);

  if (shouldPopulate) {
    dbQuery = dbQuery
      .populate('user_id', 'name email role branch isActive lastLogin phone')
      .populate('manager_id', 'first_name last_name employee_code email department')
      .populate('deletedBy', 'name email role');
  }

  const [employees, total, totalActive, totalTrash] = await Promise.all([
    dbQuery.lean(),
    Employee.countDocuments(query),
    Employee.countDocuments({ deletionStage: DELETION_STAGES.ACTIVE }),
    Employee.countDocuments({ deletionStage: DELETION_STAGES.TRASH }),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      message: 'Employees retrieved successfully',
      employees,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit) || 1,
      },
      stats: {
        totalActive,
        totalTrash,
        totalCount: totalActive + totalTrash,
      },
    })
  );
});

/**
 * Get Trash Employees
 * GET /api/v1/employees/trash
 */
const getTrashEmployees = asyncHandler(async (req, res) => {
  req.query.view = 'trash';
  return getEmployees(req, res);
});

/**
 * Get Single Employee
 * GET /api/v1/employees/:id
 */
const getEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id)
    .populate('user_id', 'name email role branch isActive lastLogin phone')
    .populate('manager_id', 'first_name last_name employee_code email department')
    .populate('deletedBy', 'name email role')
    .lean();

  if (!employee) {
    throw new ApiError(404, 'Employee record not found');
  }

  res.status(200).json(
    new ApiResponse(200, {
      message: 'Employee fetched successfully',
      employee,
    })
  );
});

/**
 * Create Employee & Provision User Login Credentials
 * POST /api/v1/employees
 */
const createEmployee = asyncHandler(async (req, res) => {
  const {
    first_name,
    last_name,
    employee_code,
    email,
    department,
    designation,
    branch = BRANCHES.BENGALURU,
    role = ROLES.COUNSELLOR,
    joining_date,
    employment_status = 'Active',
    contact_info = {},
    manager_id,
    password,
  } = req.body;

  if (!first_name || !last_name || !email) {
    throw new ApiError(400, 'First name, last name, and official email are required');
  }

  // Super Admin can NEVER be created as a staff employee
  if (role === ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Action Prohibited: Super Admin accounts cannot be created via Staff Management. Super Admin already exists as system owner.');
  }

  const ALLOWED_STAFF_ROLES = [ROLES.COUNSELLOR, ROLES.BRANCH_MANAGER, ROLES.APPLICATION_OFFICER, ROLES.MARKETING];
  if (!ALLOWED_STAFF_ROLES.includes(role)) {
    throw new ApiError(400, `Invalid staff role. Permitted staff roles are: ${ALLOWED_STAFF_ROLES.join(', ')}`);
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = (employee_code || `AET-${Math.floor(100 + Math.random() * 900)}`).trim().toUpperCase();

  // 1. Uniqueness check for employee_code
  const existingCode = await Employee.findOne({
    employee_code: cleanCode,
    deletionStage: DELETION_STAGES.ACTIVE,
  });
  if (existingCode) {
    throw new ApiError(409, `Employee with code ${cleanCode} already exists.`);
  }

  // 2. Uniqueness check for email
  const existingEmail = await Employee.findOne({
    email: cleanEmail,
    deletionStage: DELETION_STAGES.ACTIVE,
  });
  if (existingEmail) {
    throw new ApiError(409, `Employee with email ${cleanEmail} already exists.`);
  }

  // 3. Prepare or validate password (SEC-VULN-09 Hardened)
  const hasProvidedPassword = Boolean(password && typeof password === 'string' && password.trim());
  let initialPassword;
  let isTemporary = false;

  if (hasProvidedPassword) {
    const cleanPassword = password.trim();
    const passCheck = validatePasswordComplexity(cleanPassword);
    if (!passCheck.valid) {
      throw new ApiError(400, `Password policy error: ${passCheck.message}`);
    }
    initialPassword = cleanPassword;
  } else {
    // SEC-VULN-09: Eliminate predictable default 'Password@123'; generate unique cryptographically strong temporary password
    initialPassword = generateSecureTemporaryPassword();
    isTemporary = true;
  }

  // 4. Provision or sync User model
  let user = await User.findOne({ email: cleanEmail });
  const isUserActive = employment_status === 'Active' || employment_status === 'Probation';

  if (user) {
    user.name = `${first_name.trim()} ${last_name.trim()}`;
    user.role = role;
    user.branch = branch;
    user.phone = contact_info.phone || user.phone;
    user.isActive = isUserActive;
    user.mustChangePassword = true;
    if (hasProvidedPassword || isTemporary) {
      user.password = initialPassword;
    }
    await user.save();
  } else {
    // Only one Super Admin allowed in system rule
    if (role === ROLES.SUPER_ADMIN) {
      const superAdminExists = await User.exists({ role: ROLES.SUPER_ADMIN });
      if (superAdminExists) {
        throw new ApiError(403, 'A primary Super Admin account already exists. Multiple Super Admins are prohibited.');
      }
    }

    user = await User.create({
      name: `${first_name.trim()} ${last_name.trim()}`,
      email: cleanEmail,
      password: initialPassword,
      role,
      branch,
      phone: contact_info.phone || undefined,
      isActive: isUserActive,
      mustChangePassword: true,
    });
  }

  // 5. Create Employee record
  const employee = await Employee.create({
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    employee_code: cleanCode,
    email: cleanEmail,
    department: department ? department.trim() : 'Counselling & Admissions',
    designation: designation ? designation.trim() : 'Education Counsellor',
    branch,
    role,
    profile_photo: req.body.profile_photo || null,
    joining_date: joining_date ? new Date(joining_date) : new Date(),
    employment_status,
    contact_info: {
      phone: contact_info.phone ? contact_info.phone.trim() : '',
      address: contact_info.address ? contact_info.address.trim() : '',
      emergency_contact_name: contact_info.emergency_contact_name || '',
      emergency_contact_phone: contact_info.emergency_contact_phone || '',
    },
    manager_id: manager_id || null,
    user_id: user._id,
  });

  // Asynchronously dispatch onboarding email with credentials/invitation
  try {
    const { sendEmployeeOnboardingEmail } = require('../../services/emailService');
    if (typeof sendEmployeeOnboardingEmail === 'function') {
      sendEmployeeOnboardingEmail({
        toEmail: cleanEmail,
        recipientName: `${first_name.trim()} ${last_name.trim()}`,
        tempPassword: initialPassword,
        role,
        branch,
        employeeCode: cleanCode,
      }).catch(() => {});
    }
  } catch (_) {}

  // 6. Response construction (SEC-VULN-09: never expose auto-generated temporary password in API response)
  const credentials = {
    email: cleanEmail,
    role,
    branch,
    employee_code: cleanCode,
    mustChangePassword: true,
  };

  if (hasProvidedPassword) {
    credentials.password = initialPassword;
  } else {
    credentials.temporaryPasswordDispatched = true;
  }

  res.status(201).json(
    new ApiResponse(201, {
      message: 'Employee created and login credentials provisioned successfully',
      employee,
      credentials,
    })
  );
});

/**
 * Update Employee
 * PUT /api/v1/employees/:id
 */
const updateEmployee = asyncHandler(async (req, res) => {
  const allowedFields = [
    'first_name',
    'last_name',
    'employee_code',
    'email',
    'department',
    'designation',
    'branch',
    'role',
    'joining_date',
    'employment_status',
    'contact_info',
    'manager_id',
    'profile_photo',
  ];

  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  const employee = await Employee.findById(req.params.id).populate('user_id');
  if (!employee) {
    throw new ApiError(404, 'Employee record not found');
  }

  // Prevent modifying primary Super Admin role unless self-requested
  if (employee.user_id?.role === ROLES.SUPER_ADMIN && updates.role && updates.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Cannot demote the primary Super Admin role');
  }

  // Prevent promoting any employee to Super Admin
  if (updates.role === ROLES.SUPER_ADMIN && employee.user_id?.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Action Prohibited: Promoting staff to Super Admin is strictly prohibited.');
  }

  // Check code uniqueness if changing
  if (updates.employee_code && updates.employee_code.toUpperCase() !== employee.employee_code) {
    const existing = await Employee.findOne({
      employee_code: updates.employee_code.toUpperCase(),
      _id: { $ne: employee._id },
    });
    if (existing) {
      throw new ApiError(409, `Employee code ${updates.employee_code} is already in use.`);
    }
    updates.employee_code = updates.employee_code.toUpperCase();
  }

  // Check email uniqueness if changing
  if (updates.email && updates.email.toLowerCase() !== employee.email) {
    const cleanEmail = updates.email.toLowerCase().trim();
    const existing = await Employee.findOne({
      email: cleanEmail,
      _id: { $ne: employee._id },
    });
    if (existing) {
      throw new ApiError(409, `Employee with email ${cleanEmail} already exists.`);
    }
    updates.email = cleanEmail;
  }

  Object.assign(employee, updates);
  await employee.save();

  // Synchronize linked User account
  if (employee.user_id) {
    const user = await User.findById(employee.user_id._id || employee.user_id);
    if (user) {
      if (updates.first_name || updates.last_name) {
        user.name = `${employee.first_name} ${employee.last_name}`.trim();
      }
      if (updates.email) {
        user.email = employee.email;
      }
      if (updates.role) {
        user.role = employee.role;
      }
      if (updates.branch) {
        user.branch = employee.branch;
      }
      if (updates.contact_info?.phone) {
        user.phone = updates.contact_info.phone;
      }
      if (updates.employment_status) {
        const isNowActive = updates.employment_status === 'Active' || updates.employment_status === 'Probation';
        if (user.isActive !== isNowActive) {
          user.isActive = isNowActive;
          if (!isNowActive) {
            // Kill existing active JWT sessions immediately
            user.tokenVersion = (user.tokenVersion || 0) + 1;
          }
        }
      }
      await user.save({ validateBeforeSave: false });
    }
  }

  const updated = await Employee.findById(employee._id)
    .populate('user_id', 'name email role branch isActive lastLogin phone')
    .populate('manager_id', 'first_name last_name employee_code email department')
    .lean();

  res.status(200).json(
    new ApiResponse(200, {
      message: 'Employee updated successfully',
      employee: updated,
    })
  );
});

/**
 * Toggle Employee Status (Active, Probation, On Leave, Terminated)
 * PATCH /api/v1/employees/:id/status
 */
const toggleEmployeeStatus = asyncHandler(async (req, res) => {
  const { employment_status } = req.body;
  const validStatuses = ['Active', 'Probation', 'On Leave', 'Terminated'];

  if (!employment_status || !validStatuses.includes(employment_status)) {
    throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const employee = await Employee.findById(req.params.id);
  if (!employee) {
    throw new ApiError(404, 'Employee record not found');
  }

  employee.employment_status = employment_status;
  await employee.save();

  // Synchronize linked user active state
  if (employee.user_id) {
    const user = await User.findById(employee.user_id);
    if (user) {
      const isNowActive = employment_status === 'Active' || employment_status === 'Probation';
      user.isActive = isNowActive;
      if (!isNowActive) {
        user.tokenVersion = (user.tokenVersion || 0) + 1;
      }
      await user.save({ validateBeforeSave: false });
    }
  }

  res.status(200).json(
    new ApiResponse(200, {
      message: `Employee status changed to ${employment_status}`,
      employee,
    })
  );
});

/**
 * Move Employee to Trash (Soft Delete)
 * DELETE /api/v1/employees/:id
 */
const deleteEmployee = asyncHandler(async (req, res) => {
  const { deleteReason = 'Archived by Administrator' } = req.body || {};

  const employee = await Employee.findById(req.params.id).populate('user_id');
  if (!employee) {
    throw new ApiError(404, 'Employee record not found');
  }

  // Guard against deleting Super Admin
  if (employee.user_id?.role === ROLES.SUPER_ADMIN || employee.role === ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Action prohibited: The primary Super Admin cannot be deleted or moved to trash.');
  }

  // Guard against self-deletion
  if (employee.user_id?._id?.toString() === req.user._id?.toString()) {
    throw new ApiError(400, 'You cannot delete your own active administrator account.');
  }

  employee.deletionStage = DELETION_STAGES.TRASH;
  employee.deleteReason = deleteReason;
  employee.deletedAt = new Date();
  employee.deletedBy = req.user._id;
  await employee.save();

  // Deactivate user login immediately
  if (employee.user_id) {
    const linkedUserId = employee.user_id._id || employee.user_id;
    await User.findByIdAndUpdate(linkedUserId, {
      isActive: false,
      $inc: { tokenVersion: 1 },
    });

    // Cross-Module Resilience (GAP-05): Flag active leads and pending tasks for management reassignment
    try {
      const mongoose = require('mongoose');
      const Lead = mongoose.models.Lead || require('../leads/lead.model').Lead;
      const Task = mongoose.models.Task || require('../tasks/task.model');

      const staffName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Staff';
      const archiveDate = new Date().toLocaleDateString('en-IN');

      await Lead.updateMany(
        { assigned_to: linkedUserId, deletionStage: 'ACTIVE' },
        {
          $set: {
            current_status: 'Follow Up',
            notes: `[REASSIGNMENT NOTICE: Assigned staff ${staffName} was moved to Vault on ${archiveDate}. Reassignment required.]`,
          },
        }
      );

      await Task.updateMany(
        { assignedTo: linkedUserId, status: { $in: ['pending', 'in_progress'] } },
        {
          $set: {
            priority: 'urgent',
            description: `[URGENT REASSIGNMENT: Staff ${staffName} archived on ${archiveDate}]. Original task pending reassignment.`,
          },
        }
      );
    } catch (cleanErr) {
      console.warn('Orphaned assignment cleanup notice:', cleanErr.message);
    }
  }

  res.status(200).json(
    new ApiResponse(200, {
      message: 'Employee moved to trash successfully',
      employeeId: employee._id,
    })
  );
});

/**
 * Restore Employee from Trash
 * POST /api/v1/employees/:id/restore
 */
const restoreEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({
    _id: req.params.id,
    deletionStage: DELETION_STAGES.TRASH,
  });

  if (!employee) {
    throw new ApiError(404, 'Employee not found in trash');
  }

  employee.deletionStage = DELETION_STAGES.ACTIVE;
  employee.deleteReason = null;
  employee.deletedAt = null;
  employee.deletedBy = null;
  await employee.save();

  // Reactivate user login if employee status was Active/Probation
  if (employee.user_id) {
    const isNowActive = employee.employment_status === 'Active' || employee.employment_status === 'Probation';
    await User.findByIdAndUpdate(employee.user_id, {
      isActive: isNowActive,
    });
  }

  res.status(200).json(
    new ApiResponse(200, {
      message: 'Employee restored from trash successfully',
      employee,
    })
  );
});

/**
 * Permanent Delete Employee
 * DELETE /api/v1/employees/:id/permanent
 */
const permanentDeleteEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({
    _id: req.params.id,
    deletionStage: DELETION_STAGES.TRASH,
  }).populate('user_id');

  if (!employee) {
    throw new ApiError(404, 'Employee not found in trash. Only items in trash can be permanently removed.');
  }

  if (employee.user_id?.role === ROLES.SUPER_ADMIN || employee.role === ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Prohibited: Cannot permanently delete Super Admin account.');
  }

  const userId = employee.user_id?._id || employee.user_id;

  await Employee.findByIdAndDelete(employee._id);

  if (userId) {
    await User.findByIdAndDelete(userId);
  }

  res.status(200).json(
    new ApiResponse(200, {
      message: 'Employee record and linked credentials permanently deleted.',
      employeeId: employee._id,
    })
  );
});

module.exports = {
  getEmployees,
  getTrashEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  deleteEmployee,
  restoreEmployee,
  permanentDeleteEmployee,
};
