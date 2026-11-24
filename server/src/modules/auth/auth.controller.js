const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../users/user.model');
const { validatePasswordComplexity } = require('../../utils/passwordPolicy');
const { sendPasswordResetOTP } = require('../../services/emailService');
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
const {
  checkRotatedTokenReuse,
  recordRotatedToken,
  clearRotatedTokensForTesting,
} = require('./tokenTracker');
const {
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  getRolePermissions,
} = require('../../config/roles');

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
 * SEC-VULN-10: Short-lived access token (15m), single-use refresh token rotation with
 * unique tokenId, explicit type separation, and absolute session tracking (sessionCreatedAt).
 */
const createTokens = (user, sessionCreatedAt = null) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new ApiError(500, 'Server configuration error: JWT_SECRET is not configured.');
  }

  const tokenVersion = user.tokenVersion !== undefined ? user.tokenVersion : 0;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const sessionStartedAt =
    sessionCreatedAt !== null && sessionCreatedAt !== undefined
      ? Number(sessionCreatedAt)
      : nowSeconds;

  const accessToken = jwt.sign(
    {
      id: user._id,
      role: user.role,
      branch: user.branch,
      tokenVersion,
      mustChangePassword: Boolean(user.mustChangePassword),
      type: 'access',
    },
    jwtSecret,
    { expiresIn: JWT.ACCESS_EXPIRES_IN }
  );

  const tokenId = crypto.randomUUID();
  const refreshToken = jwt.sign(
    {
      id: user._id,
      tokenVersion,
      sessionCreatedAt: sessionStartedAt,
      tokenId,
      type: 'refresh',
    },
    jwtSecret,
    { expiresIn: JWT.REFRESH_EXPIRES_IN }
  );

  return { accessToken, refreshToken, tokenId, sessionCreatedAt: sessionStartedAt };
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
  safeUser.mustChangePassword = Boolean(user.mustChangePassword);

  res.status(200).json(
    new ApiResponse(200, {
      message: 'Authentication successful',
      user: safeUser,
      token: accessToken,
      refreshToken,
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
 * SEC-VULN-10: Enforces refresh token rotation, reuse detection with concurrent grace window,
 * absolute session expiration (30 days maximum), and token type separation.
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

  // SEC-VULN-10: Token type separation - ensure access tokens cannot be used to refresh
  if (decoded.type && decoded.type !== 'refresh') {
    throw new ApiError(401, 'Invalid token type: expected a refresh token.');
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

  // SEC-VULN-10: Absolute Session Lifetime Enforcement (30 days maximum)
  const sessionCreatedAt = decoded.sessionCreatedAt || decoded.iat || Math.floor(Date.now() / 1000);
  const absoluteMaxSeconds = (JWT.ABSOLUTE_SESSION_EXPIRES_IN_DAYS || 30) * 24 * 60 * 60;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (nowSeconds - sessionCreatedAt > absoluteMaxSeconds) {
    throw new ApiError(401, 'Absolute session lifetime (30 days) has expired. Please log in again.');
  }

  // SEC-VULN-10: Refresh Token Rotation & Reuse Detection
  const tokenKey = decoded.tokenId || crypto.createHash('sha256').update(String(token)).digest('hex');
  const rotationCheck = checkRotatedTokenReuse(tokenKey);

  const safeUser = exclude ? exclude(user.toObject(), ['password', '__v']) : user.toObject();
  delete safeUser.password;
  delete safeUser.failedLoginAttempts;
  delete safeUser.lockUntil;
  delete safeUser.tokenVersion;
  delete safeUser.__v;

  if (rotationCheck.isConcurrentReplay) {
    // Within grace window (concurrent network requests / rapid retries):
    // Replay the already-rotated token set so in-flight requests succeed safely
    if (setTokenCookies && typeof setTokenCookies === 'function') {
      try {
        setTokenCookies(res, rotationCheck.tokens.accessToken, rotationCheck.tokens.refreshToken);
      } catch (_) {}
    }

    return res.status(200).json(
      new ApiResponse(200, {
        message: 'Token refreshed successfully',
        token: rotationCheck.tokens.accessToken,
        refreshToken: rotationCheck.tokens.refreshToken,
        user: safeUser,
      })
    );
  }

  if (rotationCheck.isReused) {
    // Reuse detected outside grace period! Invalidate user session immediately
    await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });
    throw new ApiError(401, 'Invalid or expired refresh token: token reuse detected. Please log in again.');
  }

  // Issue new rotated token pair preserving original sessionCreatedAt
  const { accessToken, refreshToken: newRefreshToken } = createTokens(user, sessionCreatedAt);

  // Record old token as rotated
  recordRotatedToken(tokenKey, {
    userId: String(user._id),
    rotatedAt: Date.now(),
    sessionCreatedAt,
    tokens: { accessToken, refreshToken: newRefreshToken },
  });

  if (setTokenCookies && typeof setTokenCookies === 'function') {
    try {
      setTokenCookies(res, accessToken, newRefreshToken);
    } catch (_) {}
  }

  res.status(200).json(
    new ApiResponse(200, {
      message: 'Token refreshed successfully',
      token: accessToken,
      refreshToken: newRefreshToken,
      user: safeUser,
    })
  );
});

/**
 * Retrieve the full system role permission matrix & metadata
 * GET /api/v1/auth/permissions-matrix
 */
const getPermissionsMatrix = asyncHandler(async (req, res) => {
  res.status(200).json(
    new ApiResponse(200, {
      roles: ROLES,
      roleLabels: ROLE_LABELS,
      roleDescriptions: ROLE_DESCRIPTIONS,
      permissions: ROLE_PERMISSIONS,
      userPermissions: req.user ? getRolePermissions(req.user.role) : null,
      currentUserRole: req.user ? req.user.role : null,
    })
  );
});

/**
 * Check or test whether a role has access to a specific resource & action
 * POST /api/v1/auth/check-permission
 * Body: { resource, action, simulatedRole, enforce }
 */
const checkPermission = asyncHandler(async (req, res) => {
  const { resource, action, simulatedRole, enforce } = req.body || {};

  if (!resource || !action) {
    throw new ApiError(400, 'Both "resource" and "action" are required in request body.');
  }

  // Target role determination:
  let targetRole = req.user?.role || ROLES.COUNSELLOR;
  if (simulatedRole) {
    if (req.user?.role === ROLES.SUPER_ADMIN) {
      targetRole = simulatedRole;
    } else {
      targetRole = req.user?.role;
    }
  }

  const allowed = hasPermission(targetRole, resource, action);

  if (enforce && !allowed) {
    throw new ApiError(
      403,
      `Access forbidden: role [${targetRole}] does not have permission for [${resource}:${action}].`
    );
  }

  res.status(200).json(
    new ApiResponse(200, {
      allowed,
      role: targetRole,
      resource,
      action,
      enforced: !!enforce,
      message: allowed
        ? `Access GRANTED: Role [${targetRole}] is authorized to perform [${action}] on [${resource}].`
        : `Access DENIED: Role [${targetRole}] is forbidden from performing [${action}] on [${resource}].`,
    })
  );
});

/**
 * Step 1: Request Password Reset OTP
 * POST /api/v1/auth/forgot-password
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body || {};
  const cleanEmail = email ? email.trim().toLowerCase() : '';

  if (!cleanEmail) {
    throw new ApiError(400, 'Please provide your registered email address.');
  }

  const user = await User.findOne({ email: cleanEmail });

  // For security against user enumeration, we still respond with a standard message
  if (!user || !user.isActive) {
    return res.status(200).json(
      new ApiResponse(200, {
        message: 'If an account exists with this email address, a 6-digit verification code has been dispatched.',
      })
    );
  }

  // Generate 6-digit numeric OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const hashedOtp = await bcrypt.hash(otp, 10);

  // Store hashed OTP valid for 15 minutes
  user.resetOTP = hashedOtp;
  user.resetOTPExpires = new Date(Date.now() + 15 * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  // Dispatch luxury email
  await sendPasswordResetOTP(user.email, otp, user.name);

  // SEC-VULN-05: Completely eliminate devOtp and plaintext OTP leakage across all environments.
  // Maintain generic response structure to prevent user enumeration.
  res.status(200).json(
    new ApiResponse(200, {
      message: 'If an account exists with this email address, a 6-digit verification code has been dispatched.',
    })
  );
});

/**
 * Step 2: Verify 6-Digit Reset OTP
 * POST /api/v1/auth/verify-reset-otp
 */
const verifyResetOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body || {};
  const cleanEmail = email ? email.trim().toLowerCase() : '';

  if (!cleanEmail || !otp) {
    throw new ApiError(400, 'Email address and 6-digit verification code are required.');
  }

  const user = await User.findOne({ email: cleanEmail }).select('+resetOTP +resetOTPExpires');

  if (!user || !user.resetOTP || !user.resetOTPExpires) {
    throw new ApiError(400, 'No active reset request found for this email. Please request a new code.');
  }

  if (user.resetOTPExpires < new Date()) {
    throw new ApiError(400, 'Verification code has expired. Please request a new one.');
  }

  const isMatch = await bcrypt.compare(String(otp).trim(), user.resetOTP);
  if (!isMatch) {
    throw new ApiError(400, 'Invalid verification code. Please check your email and try again.');
  }

  // Generate cryptographic single-use resetToken (valid for 15 minutes)
  const rawResetToken = crypto.randomBytes(32).toString('hex');
  const hashedResetToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');

  user.resetToken = hashedResetToken;
  user.resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000);
  user.resetOTP = undefined;
  user.resetOTPExpires = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(200).json(
    new ApiResponse(200, {
      message: 'Verification code confirmed. You may now create a new password.',
      resetToken: rawResetToken,
      email: cleanEmail,
    })
  );
});

/**
 * Step 3: Complete Password Reset with New Password
 * POST /api/v1/auth/reset-password
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { email, resetToken, otp, password, newPassword, confirmPassword } = req.body || {};
  const cleanEmail = email ? email.trim().toLowerCase() : '';
  const candidatePassword = newPassword || password;

  if (!cleanEmail) {
    throw new ApiError(400, 'Email address is required.');
  }

  if (!candidatePassword) {
    throw new ApiError(400, 'New password is required.');
  }

  if (confirmPassword && candidatePassword !== confirmPassword) {
    throw new ApiError(400, 'New password and confirmation password do not match.');
  }

  // Validate password policy
  const complexity = validatePasswordComplexity(candidatePassword);
  if (!complexity.valid) {
    throw new ApiError(400, complexity.message);
  }

  const user = await User.findOne({ email: cleanEmail }).select(
    '+resetToken +resetTokenExpires +resetOTP +resetOTPExpires'
  );

  if (!user) {
    throw new ApiError(404, 'User account not found.');
  }

  // Verify either via resetToken or direct valid OTP
  let authorized = false;

  if (resetToken) {
    const hashedToken = crypto.createHash('sha256').update(String(resetToken).trim()).digest('hex');
    if (
      user.resetToken &&
      user.resetToken === hashedToken &&
      user.resetTokenExpires &&
      user.resetTokenExpires > new Date()
    ) {
      authorized = true;
    }
  } else if (otp && user.resetOTP && user.resetOTPExpires && user.resetOTPExpires > new Date()) {
    const isOtpMatch = await bcrypt.compare(String(otp).trim(), user.resetOTP);
    if (isOtpMatch) {
      authorized = true;
    }
  }

  if (!authorized) {
    throw new ApiError(400, 'Invalid or expired password reset authorization. Please request a new verification code.');
  }

  // Update password and invalidate all existing sessions
  user.password = candidatePassword;
  user.mustChangePassword = false;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  user.resetOTP = undefined;
  user.resetOTPExpires = undefined;
  user.resetToken = undefined;
  user.resetTokenExpires = undefined;
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  await user.save();

  res.status(200).json(
    new ApiResponse(200, {
      message: 'Password reset successful. All active sessions have been invalidated. Please log in with your new credentials.',
    })
  );
});

/**
 * Change authenticated user password (Mandatory setup or routine change)
 * POST /api/v1/auth/change-password
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current password and new password are required.');
  }

  if (confirmPassword && newPassword !== confirmPassword) {
    throw new ApiError(400, 'New password and confirmation password do not match.');
  }

  if (currentPassword === newPassword) {
    throw new ApiError(400, 'New password must be different from current password.');
  }

  const policyCheck = validatePasswordComplexity(newPassword);
  if (!policyCheck.valid) {
    throw new ApiError(400, policyCheck.message);
  }

  // Retrieve user with password hash
  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    throw new ApiError(404, 'User account not found.');
  }

  const isCurrentMatch = await user.matchPassword(currentPassword);
  if (!isCurrentMatch) {
    throw new ApiError(401, 'Current password is incorrect.');
  }

  // Update password and clear mustChangePassword state
  user.password = newPassword;
  user.mustChangePassword = false;
  // pre-save hook automatically increments tokenVersion and hashes password
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  await user.save();

  // Issue fresh tokens for the new tokenVersion
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
  safeUser.mustChangePassword = false;

  res.status(200).json(
    new ApiResponse(200, {
      message: 'Password changed successfully. Your account is now fully active.',
      user: safeUser,
      token: accessToken,
      refreshToken,
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
  getPermissionsMatrix,
  checkPermission,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  changePassword,
  clearRotatedTokensForTesting,
};
