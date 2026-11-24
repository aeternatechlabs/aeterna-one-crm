const jwt = require('jsonwebtoken');
const User = require('../modules/users/user.model');
const { asyncHandler, ApiError } = require('../utils/devilWrapper');

/**
 * Authentication Middleware
 * Validates JWT access token from cookies or Authorization header
 */
const protect = asyncHandler(async (req, res, next) => {
  let token = null;

  // 1. Check cookies (preferred)
  if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }
  // 2. Check Authorization header: Bearer <token>
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Authentication required. No token provided.');
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new ApiError(500, 'Server configuration error: JWT_SECRET is not configured.');
  }
  const decoded = jwt.verify(token, jwtSecret);

  // SEC-VULN-10: Token type separation - ensure refresh tokens cannot be used as access tokens
  if (decoded.type && decoded.type !== 'access') {
    throw new ApiError(401, 'Invalid token type: expected an access token.');
  }

  // Look up user from database
  const user = await User.findById(decoded.id).select('-password');

  if (!user) {
    throw new ApiError(401, 'Authenticated user no longer exists.');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been deactivated. Please contact an administrator.');
  }

  // SEC-04: Validate tokenVersion to reject zombie sessions after logout or password change
  const userTokenVersion = user.tokenVersion || 0;
  const tokenVersion = decoded.tokenVersion !== undefined ? decoded.tokenVersion : 0;

  if (tokenVersion !== userTokenVersion) {
    throw new ApiError(401, 'Session has expired or token has been revoked. Please log in again.');
  }

  // SEC-VULN-09: Mandatory password change gate for temporary credentials / initial provisioning
  if (user.mustChangePassword) {
    const rawPath = (req.originalUrl || (req.baseUrl ? req.baseUrl + req.path : req.url) || req.path || '').split('?')[0];
    const isAllowedAuthPath =
      rawPath.endsWith('/auth/change-password') ||
      rawPath.endsWith('/auth/me') ||
      rawPath.endsWith('/auth/logout') ||
      rawPath.endsWith('/auth/refresh') ||
      rawPath === '/change-password' ||
      rawPath === '/me' ||
      rawPath === '/logout';

    if (!isAllowedAuthPath) {
      throw new ApiError(
        403,
        'Password change required. You must change your temporary password before accessing CRM features.',
        { code: 'PASSWORD_CHANGE_REQUIRED', mustChangePassword: true }
      );
    }
  }

  req.user = user;
  next();
});

module.exports = { protect };
