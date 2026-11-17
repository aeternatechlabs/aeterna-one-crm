/**
 * Centralized import & adapter for devil-backend-nodejs utilities
 * Direct integration with custom backend package (v4.1.0)
 */

const devil = require('devil-backend-nodejs');

// Primary utilities
const asyncHandler = devil.asyncHandler;
const ApiError = devil.ApiError;
const ApiResponse = devil.ApiResponse;

// Unpack utilities exported as module objects
const validateEnv = (devil.validateEnv && devil.validateEnv.validateEnv) ? devil.validateEnv.validateEnv : devil.validateEnv;
const paginate = (devil.paginate && devil.paginate.paginate) ? devil.paginate.paginate : devil.paginate;
const calculatePagination = (devil.calculatePagination && devil.calculatePagination.calculatePagination) ? devil.calculatePagination.calculatePagination : devil.calculatePagination;
const generateOTP = (devil.generateOTP && devil.generateOTP.generateOTP) ? devil.generateOTP.generateOTP : devil.generateOTP;
const randomString = (devil.randomString && devil.randomString.randomString) ? devil.randomString.randomString : devil.randomString;
const slugify = (devil.slugify && devil.slugify.slugify) ? devil.slugify.slugify : devil.slugify;
const capitalize = (devil.capitalize && devil.capitalize.capitalize) ? devil.capitalize.capitalize : devil.capitalize;
const capitalizeWords = (devil.capitalizeWords && devil.capitalizeWords.capitalizeWords) ? devil.capitalizeWords.capitalizeWords : devil.capitalizeWords;
const formatDate = (devil.formatDate && devil.formatDate.formatDate) ? devil.formatDate.formatDate : devil.formatDate;
const timeAgo = (devil.timeAgo && devil.timeAgo.timeAgo) ? devil.timeAgo.timeAgo : devil.timeAgo;
const pick = (devil.pick && devil.pick.pick) ? devil.pick.pick : devil.pick;
const exclude = (devil.exclude && devil.exclude.exclude) ? devil.exclude.exclude : devil.exclude;
const isEmptyObject = (devil.isEmptyObject && devil.isEmptyObject.isEmptyObject) ? devil.isEmptyObject.isEmptyObject : devil.isEmptyObject;

// Token helpers
const tokenHelpers = devil.generateToken || {};
const generateAccessToken = tokenHelpers.generateAccessToken;
const generateRefreshToken = tokenHelpers.generateRefreshToken;
const setTokenCookies = tokenHelpers.setTokenCookies;

module.exports = {
  asyncHandler,
  ApiError,
  ApiResponse,
  validateEnv,
  paginate,
  calculatePagination,
  generateOTP,
  randomString,
  slugify,
  capitalize,
  capitalizeWords,
  formatDate,
  timeAgo,
  pick,
  exclude,
  isEmptyObject,
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
  rawDevil: devil,
};
