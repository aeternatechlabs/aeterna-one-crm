const User = require('./user.model');
const { asyncHandler, ApiError, ApiResponse, paginate } = require('../../utils/devilWrapper');
const { ROLES } = require('../../config/constants');

/**
 * List users (Staff Directory)
 * GET /api/v1/users
 */
const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = '', role, branch, fields } = req.query;

  const query = {};

  // Branch filtering (respect branchScope if present)
  if (req.branchScope && req.branchScope !== 'all') {
    query.branch = req.branchScope;
  } else if (branch && branch !== 'all') {
    query.branch = branch;
  }

  // Role filtering
  if (role) {
    query.role = role;
  }

  // Search by name or email (SEC-06 & OBS-1: length check, validate regex pattern and escape special characters)
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
    query.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
    ];
  }

  // Minimal response mapping & data minimization (Rule 18 & Rule 20)
  // Enforce projection allowlist: password and internal fields can NEVER be selected
  const ALLOWED_USER_FIELDS = ['name', 'email', 'role', 'branch', 'phone', 'isActive', 'lastLogin', 'createdAt', 'updatedAt'];
  let selectFields;
  if (fields) {
    const requested = fields
      .split(',')
      .map((f) => f.trim())
      .filter((f) => ALLOWED_USER_FIELDS.includes(f));
    selectFields = requested.length > 0 ? requested.join(' ') : '-password -__v';
  } else {
    selectFields = '-password -__v';
  }

  // Sanitize and cap pagination bounds (F-05)
  const parsedLimit = parseInt(limit, 10);
  const safeLimit = isNaN(parsedLimit) || parsedLimit <= 0 ? 10 : Math.min(parsedLimit, 100);

  const parsedPage = parseInt(page, 10);
  const safePage = isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;

  let result;
  if (paginate && typeof paginate === 'function') {
    result = await paginate(User, query, {
      page: safePage,
      limit: safeLimit,
      sort: { createdAt: -1 },
      select: selectFields,
    });
  } else {
    const skip = (safePage - 1) * safeLimit;
    const users = await User.find(query)
      .select(selectFields)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean();
    const total = await User.countDocuments(query);
    result = {
      data: users,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  // F-07: Ensure projection allowlist is enforced on result.data (devil paginate ignores options.select)
  if (result && Array.isArray(result.data)) {
    result.data = result.data.map((user) => {
      const raw = user && typeof user.toObject === 'function' ? user.toObject() : { ...user };
      if (fields) {
        const requested = fields
          .split(',')
          .map((f) => f.trim())
          .filter((f) => ALLOWED_USER_FIELDS.includes(f));
        if (requested.length > 0) {
          const allowedKeys = new Set(['_id', 'id', ...requested]);
          const projected = {};
          for (const key of Object.keys(raw)) {
            if (allowedKeys.has(key)) {
              projected[key] = raw[key];
            }
          }
          delete projected.password;
          delete projected.__v;
          return projected;
        }
      }
      delete raw.password;
      delete raw.__v;
      return raw;
    });
  }

  res.status(200).json(
    new ApiResponse(200, {
      message: 'Users fetched successfully',
      ...result,
    })
  );
});

module.exports = {
  getUsers,
};
