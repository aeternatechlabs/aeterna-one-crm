const { body } = require('express-validator');
const { ROLES, BRANCHES } = require('../../config/constants');
const { PASSWORD_POLICY, validatePasswordComplexity } = require('../../utils/passwordPolicy');

const registerValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 60 })
    .withMessage('Name must be between 2 and 60 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .custom((value) => {
      const result = validatePasswordComplexity(value);
      if (!result.valid) {
        throw new Error(result.message);
      }
      return true;
    }),
  body('role')
    .notEmpty()
    .withMessage('Role is required for staff provisioning')
    .isIn(Object.values(ROLES))
    .withMessage(`Role must be one of: ${Object.values(ROLES).join(', ')}`),
  body('branch')
    .notEmpty()
    .withMessage('Branch is required for staff provisioning')
    .isIn(Object.values(BRANCHES))
    .withMessage(`Branch must be one of: ${Object.values(BRANCHES).join(', ')}`)
    .custom((branch, { req }) => {
      if (req.body.role && req.body.role !== ROLES.SUPER_ADMIN && branch === BRANCHES.ALL) {
        throw new Error('Only Super Admin can be assigned to all branches. Staff must be assigned to a specific branch.');
      }
      return true;
    }),
  body('phone')
    .optional()
    .trim(),
];

const loginValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

module.exports = {
  registerValidator,
  loginValidator,
};
