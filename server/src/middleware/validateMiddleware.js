const { validationResult } = require('express-validator');
const { ApiError } = require('../utils/devilWrapper');

/**
 * Express-validator result handler middleware
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    throw new ApiError(400, 'Request validation failed', formattedErrors);
  }
  next();
};

module.exports = { validate };
