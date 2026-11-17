/**
 * Aeterna One — Unified Password Complexity Policy (SEC-10)
 *
 * Enforces baseline password complexity across all account creation and modification flows:
 * - Minimum 8 characters
 * - Maximum 128 characters
 * - At least one uppercase letter (A-Z)
 * - At least one numeric digit (0-9)
 * - At least one special character (!@#$%^&*()_+-=[]{};':"|,.<>/?)
 *
 * Strictly preserves passwords as-is without trimming or silent modifications before hashing.
 */

const PASSWORD_POLICY = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  UPPERCASE_REGEX: /[A-Z]/,
  DIGIT_REGEX: /[0-9]/,
  SPECIAL_CHAR_REGEX: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
  ERROR_MESSAGE:
    'Password must be between 8 and 128 characters long and contain at least one uppercase letter, one digit, and one special character.',
};

/**
 * Validates a password candidate against the unified password policy
 * @param {string} password - Raw password candidate (do not trim!)
 * @returns {{ valid: boolean, message?: string }}
 */
function validatePasswordComplexity(password) {
  if (typeof password !== 'string') {
    return { valid: false, message: 'Password is required and must be a string.' };
  }

  if (password.length < PASSWORD_POLICY.MIN_LENGTH || password.length > PASSWORD_POLICY.MAX_LENGTH) {
    return { valid: false, message: PASSWORD_POLICY.ERROR_MESSAGE };
  }

  if (!PASSWORD_POLICY.UPPERCASE_REGEX.test(password)) {
    return { valid: false, message: PASSWORD_POLICY.ERROR_MESSAGE };
  }

  if (!PASSWORD_POLICY.DIGIT_REGEX.test(password)) {
    return { valid: false, message: PASSWORD_POLICY.ERROR_MESSAGE };
  }

  if (!PASSWORD_POLICY.SPECIAL_CHAR_REGEX.test(password)) {
    return { valid: false, message: PASSWORD_POLICY.ERROR_MESSAGE };
  }

  return { valid: true };
}

module.exports = {
  PASSWORD_POLICY,
  validatePasswordComplexity,
};
