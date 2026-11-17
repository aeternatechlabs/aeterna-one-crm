const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../users/user.model');
const { validatePasswordComplexity } = require('../../utils/passwordPolicy');
const {
  asyncHandler,
  ApiError,
  ApiResponse,
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
  exclude,
} = require('../../utils/devilWrapper');
const { JWT, ROLES, BRANCHES } = require('../../config/constants');

/**
 * SEC-02: Constant-Time Developer Key Verification
 * Enforces fail-closed validation: If DEVELOPER_SETUP_KEY is not configured in the environment,
 * provisioning is strictly rejected. Comparison uses crypto.timingSafeEqual on SHA-256 digests
 * to prevent side-channel timing analysis while safely handling variable buffer lengths.
 */
const verifyDeveloperKey = (devKey) => {
  const expectedKey = process.env.DEVELOPER_SETUP_KEY;
  if (!expectedKey || typeof expectedKey !== 'string' || !expectedKey.trim()) {
    throw new ApiError(
      500,
      'Server configuration error: Super Admin provisioning is disabled because DEVELOPER_SETUP_KEY is not configured.'
    );
  }

  if (!devKey || typeof devKey !== 'string') {
    return false;
  }

  const hashProvided = crypto.createHash('sha256').update(devKey.trim()).digest();
  const hashExpected = crypto.createHash('sha256').update(expectedKey.trim()).digest();

  return crypto.timingSafeEqual(hashProvided, hashExpected);
};

/**
 * Sign JWT token for user (Fail-Closed if JWT_SECRET missing)
 * SEC-04: Embeds current tokenVersion to support instant session invalidation
 */
const createTokens = (user) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new ApiError(500, 'Server configuration error: JWT_SECRET is not configured.');
  }

  const tokenVersion = user.tokenVersion !== undefined ? user.tokenVersion : 0;

  const accessToken = jwt.sign(
    { id: user._id, role: user.role, branch: user.branch, tokenVersion },
    jwtSecret,
    { expiresIn: JWT.ACCESS_EXPIRES_IN }
  );
  const refreshToken = jwt.sign(
    { id: user._id, tokenVersion },
    jwtSecret,
    { expiresIn: JWT.REFRESH_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
};

/**
 * One-Time Super Admin Provisioning (Requires Developer Key & Single Super Admin Rule)
 * POST /api/v1/auth/setup-super-admin
 */
const setupSuperAdmin = asyncHandler(async (req, res) => {
  const devKey =
    req.headers['x-developer-key'] ||
    req.headers['x-setup-key'] ||
    (req.body && (req.body.developerKey || req.body.setupKey));

  if (!verifyDeveloperKey(devKey)) {
    throw new ApiError(
      403,
      "Nice try, Sherlock! 🕵️‍♂️ Trying to become Super Admin without the secret Developer Key? Access Denied! 🚫🔐"
    );
  }

  const superAdminExists = await User.exists({ role: ROLES.SUPER_ADMIN });
  if (superAdminExists) {
    throw new ApiError(
      403,
      "Hold up, Chief! 👑 There can only be ONE Super Admin in this system, and that throne is already claimed! Duplicate Super Admin creation is strictly prohibited. 🦁🛑"
    );
  }

  const { name, email, password, phone } = req.body || {};
  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email, and password are required to create Super Admin.');
  }

  const passwordPolicyCheck = validatePasswordComplexity(password);
  if (!passwordPolicyCheck.valid) {
    throw new ApiError(400, passwordPolicyCheck.message);
  }

  const cleanEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: cleanEmail });
  if (existingUser) {
    throw new ApiError(409, 'An account with this email address already exists.');
  }

  let user;
  try {
    user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: ROLES.SUPER_ADMIN,
      branch: BRANCHES.ALL,
      phone: phone ? phone.trim() : undefined,
    });
  } catch (err) {
    // SEC-01: Gracefully handle concurrent duplicate Super Admin or duplicate email errors
    if (err.code === 11000) {
      if (err.keyPattern && err.keyPattern.role) {
        throw new ApiError(
          403,
          "Hold up, Chief! 👑 There can only be ONE Super Admin in this system, and that throne is already claimed! Duplicate Super Admin creation is strictly prohibited. 🦁🛑"
        );
      }
      if (err.keyPattern && err.keyPattern.email) {
        throw new ApiError(409, 'An account with this email address already exists.');
      }
    }
    throw err;
  }

  const safeUser = exclude ? exclude(user.toObject(), ['password', '__v']) : user.toObject();
  delete safeUser.password;
  delete safeUser.failedLoginAttempts;
  delete safeUser.lockUntil;
  delete safeUser.__v;

  res.status(201).json(
    new ApiResponse(201, {
      message: '👑 Super Admin provisioned successfully! The Supreme Commander throne has been claimed.',
      user: safeUser,
    })
  );
});

/**
 * Provision a new staff user (Super Admin Only)
 * POST /api/v1/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, branch, phone } = req.body;

  // Security Check: Guard Super Admin creation
  const isSuperAdminRole = role && (
    role.toLowerCase() === ROLES.SUPER_ADMIN ||
    role.toLowerCase() === 'superadmin' ||
    role.toLowerCase() === 'super-admin'
  );

  if (isSuperAdminRole) {
    const superAdminExists = await User.exists({ role: ROLES.SUPER_ADMIN });
    if (superAdminExists) {
      throw new ApiError(
        403,
        "Hold up, Chief! 👑 There can only be ONE Super Admin in this system, and that throne is already claimed! Duplicate Super Admin creation is strictly prohibited. 🦁🛑"
      );
    }

    const devKey =
      req.headers['x-developer-key'] ||
      req.headers['x-setup-key'] ||
      (req.body && (req.body.developerKey || req.body.setupKey));

    if (!verifyDeveloperKey(devKey)) {
      throw new ApiError(
        403,
        "Nice try, Sherlock! 🕵️‍♂️ Trying to register Super Admin role without the secret Developer Key? Access Denied! 🚫🔐"
      );
    }
  }

  const cleanEmail = email ? email.toLowerCase().trim() : '';
  const existingUser = await User.findOne({ email: cleanEmail });
  if (existingUser) {
    throw new ApiError(409, 'An account with this email address already exists.');
  }

  let user;
  try {
    user = await User.create({
      name,
      email: cleanEmail,
      password,
      role: role || ROLES.COUNSELLOR,
      branch: branch || BRANCHES.BENGALURU,
      phone,
    });
  } catch (err) {
    // SEC-01: Gracefully handle concurrent duplicate Super Admin or duplicate email errors
    if (err.code === 11000) {
      if (err.keyPattern && err.keyPattern.role) {
        throw new ApiError(
          403,
          "Hold up, Chief! 👑 There can only be ONE Super Admin in this system, and that throne is already claimed! Duplicate Super Admin creation is strictly prohibited. 🦁🛑"
        );
      }
      if (err.keyPattern && err.keyPattern.email) {
        throw new ApiError(409, 'An account with this email address already exists.');
      }
    }
    throw err;
  }

  const safeUser = exclude ? exclude(user.toObject(), ['password', '__v']) : user.toObject();
  delete safeUser.password;
  delete safeUser.failedLoginAttempts;
  delete safeUser.lockUntil;
  delete safeUser.__v;

  res.status(201).json(
    new ApiResponse(201, {
      message: 'Staff user provisioned successfully',
      user: safeUser,
    })
  );
});

/**
 * Login user
 * POST /api/v1/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  const cleanEmail = email ? email.toLowerCase().trim() : '';

  if (!cleanEmail || !password) {
    throw new ApiError(400, 'Email and password are required.');
  }

  const user = await User.findOne({ email: cleanEmail }).select('+password');

  if (!user) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  // SEC-03: Reject login if account is currently locked due to failed attempts
  if (user.isLocked()) {
    const remainingMinutes = Math.max(1, Math.ceil((user.lockUntil.getTime() - Date.now()) / (60 * 1000)));
    throw new ApiError(
      423,
      `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute(s).`
    );
  }

  const isPasswordMatch = await user.matchPassword(password);
  if (!isPasswordMatch) {
    // SEC-03: Atomically increment failed attempts and trigger 15-minute lock on 5th consecutive failure
    await user.recordFailedLogin();
    throw new ApiError(401, 'Invalid email or password.');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been deactivated. Please contact an administrator.');
  }

  // SEC-03: Reset failed attempts counter and update lastLogin
  await user.resetFailedLogin();

  const { accessToken, refreshToken } = createTokens(user);

  if (setTokenCookies && typeof setTokenCookies === 'function') {
    try {
      setTokenCookies(res, accessToken, refreshToken);
    } catch (_) {}
  }

  const safeUser = exclude ? exclude(user.toObject(), ['password', '__v']) : user.toObject();
  delete safeUser.password;
  delete safeUser.failedLoginAttempts;
  delete safeUser.lockUntil;
  delete safeUser.__v;

  res.status(200).json(
    new ApiResponse(200, {
      message: 'Authentication successful',
      user: safeUser,
      token: accessToken,
    })
  );
});

/**
 * Get current authenticated user profile
 * GET /api/v1/auth/me
 */
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json(
    new ApiResponse(200, {
      message: 'Current profile retrieved successfully',
      user: req.user,
    })
  );
});

/**
 * Logout user
 * POST /api/v1/auth/logout
 * SEC-04: Increments tokenVersion on User document to immediately invalidate all existing
 * JWT access & refresh tokens across all client instances, preventing zombie sessions.
 */
const logout = asyncHandler(async (req, res) => {
  let token = null;
  if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.refreshToken) {
    token = req.cookies.refreshToken;
  } else if (req.body && req.body.refreshToken) {
    token = req.body.refreshToken;
  }

  const userId = req.user ? req.user._id : null;

  if (userId) {
    await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
  } else if (token) {
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (jwtSecret) {
        const decoded = jwt.verify(token, jwtSecret);
        if (decoded && decoded.id) {
          await User.updateOne({ _id: decoded.id }, { $inc: { tokenVersion: 1 } });
        }
      }
    } catch (_) {
      // If token is invalid or expired, proceed with cookie cleanup
    }
  }

  const isProduction = process.env.NODE_ENV === 'production';

  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
  });

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
  });

  res.status(200).json(new ApiResponse(200, 'Logged out successfully'));
});

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
const refresh = asyncHandler(async (req, res) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new ApiError(500, 'Server configuration error: JWT_SECRET is not configured.');
  }

  let token = null;
  if (req.cookies && req.cookies.refreshToken) {
    token = req.cookies.refreshToken;
  } else if (req.body && req.body.refreshToken) {
    token = req.body.refreshToken;
  }

  if (!token) {
    throw new ApiError(401, 'Authentication required. No refresh token provided.');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, jwtSecret);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired refresh token.');
  }

  const user = await User.findById(decoded.id).select('-password');
  if (!user) {
    throw new ApiError(401, 'Authenticated user no longer exists.');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been deactivated. Please contact an administrator.');
  }

  // SEC-04: Validate refresh token version to reject revoked sessions
  const userTokenVersion = user.tokenVersion || 0;
  const tokenVersion = decoded.tokenVersion !== undefined ? decoded.tokenVersion : 0;
  if (tokenVersion !== userTokenVersion) {
    throw new ApiError(401, 'Refresh token has been revoked or expired. Please log in again.');
  }

  const { accessToken, refreshToken: newRefreshToken } = createTokens(user);

  if (setTokenCookies && typeof setTokenCookies === 'function') {
    try {
      setTokenCookies(res, accessToken, newRefreshToken);
    } catch (_) {}
  }

  const safeUser = exclude ? exclude(user.toObject(), ['password', '__v']) : user.toObject();
  delete safeUser.password;
  delete safeUser.failedLoginAttempts;
  delete safeUser.lockUntil;
  delete safeUser.tokenVersion;
  delete safeUser.__v;

  res.status(200).json(
    new ApiResponse(200, {
      message: 'Token refreshed successfully',
      token: accessToken,
      user: safeUser,
    })
  );
});

module.exports = {
  setupSuperAdmin,
  register,
  login,
  getMe,
  logout,
  refresh,
  createTokens,
};
