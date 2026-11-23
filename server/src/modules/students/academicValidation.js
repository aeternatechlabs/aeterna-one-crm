/**
 * Academic & Standardized Test Score Validation Engine
 * Aligned with international testing bodies (IDP/British Council IELTS, ETS TOEFL/GRE, Pearson PTE)
 */

const { TEST_SCORE_TYPES } = require('../../config/constants');

/**
 * Validates a standardized test score record
 * @param {Object} record - { testType, overallScore, subScores, testDate, validUntil, trfNumber }
 * @returns {{ valid: boolean, error?: string }}
 */
function validateTestScore(record) {
  if (!record || typeof record !== 'object') {
    return { valid: false, error: 'Test score record must be an object' };
  }

  const { testType, overallScore, subScores, testDate, validUntil } = record;

  if (!testType || !Object.values(TEST_SCORE_TYPES).includes(testType)) {
    return { valid: false, error: `Invalid test type. Supported: ${Object.values(TEST_SCORE_TYPES).join(', ')}` };
  }

  if (overallScore === undefined || overallScore === null || isNaN(Number(overallScore))) {
    return { valid: false, error: `Overall score is required for ${testType.toUpperCase()}` };
  }

  const score = Number(overallScore);

  switch (testType) {
    case TEST_SCORE_TYPES.IELTS: {
      if (score < 0 || score > 9) {
        return { valid: false, error: 'IELTS overall band score must be between 0.0 and 9.0' };
      }
      if ((score * 10) % 5 !== 0) {
        return { valid: false, error: 'IELTS band score must be in half-band increments (e.g. 6.5, 7.0, 7.5)' };
      }
      if (subScores) {
        for (const band of ['reading', 'writing', 'speaking', 'listening']) {
          if (subScores[band] !== undefined && (subScores[band] < 0 || subScores[band] > 9)) {
            return { valid: false, error: `IELTS ${band} score must be between 0.0 and 9.0` };
          }
        }
      }
      break;
    }

    case TEST_SCORE_TYPES.TOEFL: {
      if (score < 0 || score > 120 || !Number.isInteger(score)) {
        return { valid: false, error: 'TOEFL iBT overall score must be an integer between 0 and 120' };
      }
      if (subScores) {
        for (const section of ['reading', 'writing', 'speaking', 'listening']) {
          if (subScores[section] !== undefined && (subScores[section] < 0 || subScores[section] > 30)) {
            return { valid: false, error: `TOEFL ${section} score must be between 0 and 30` };
          }
        }
      }
      break;
    }

    case TEST_SCORE_TYPES.PTE: {
      if (score < 10 || score > 90 || !Number.isInteger(score)) {
        return { valid: false, error: 'PTE Academic score must be an integer between 10 and 90' };
      }
      break;
    }

    case TEST_SCORE_TYPES.DUOLINGO: {
      if (score < 10 || score > 160 || score % 5 !== 0) {
        return { valid: false, error: 'Duolingo English Test score must be between 10 and 160 in increments of 5' };
      }
      break;
    }

    case TEST_SCORE_TYPES.GRE: {
      if (score < 260 || score > 340 || !Number.isInteger(score)) {
        return { valid: false, error: 'GRE General total score must be an integer between 260 and 340' };
      }
      if (subScores) {
        if (subScores.verbal !== undefined && (subScores.verbal < 130 || subScores.verbal > 170)) {
          return { valid: false, error: 'GRE Verbal Reasoning score must be between 130 and 170' };
        }
        if (subScores.quantitative !== undefined && (subScores.quantitative < 130 || subScores.quantitative > 170)) {
          return { valid: false, error: 'GRE Quantitative Reasoning score must be between 130 and 170' };
        }
        if (subScores.analyticalWriting !== undefined && (subScores.analyticalWriting < 0 || subScores.analyticalWriting > 6)) {
          return { valid: false, error: 'GRE Analytical Writing score must be between 0.0 and 6.0' };
        }
      }
      break;
    }

    case TEST_SCORE_TYPES.GMAT: {
      if (score < 200 || score > 800) {
        return { valid: false, error: 'GMAT total score must be between 200 and 800' };
      }
      break;
    }

    default:
      break;
  }

  // Date chronological validity check
  if (testDate && validUntil) {
    const tDate = new Date(testDate);
    const vDate = new Date(validUntil);
    if (vDate <= tDate) {
      return { valid: false, error: 'Test score validity expiry date must be after the test date' };
    }
  }

  return { valid: true };
}

/**
 * Validates an academic qualification entry
 * @param {Object} record - { level, institution, boardOrUniversity, yearOfPassing, score, gradingSystem }
 * @returns {{ valid: boolean, error?: string }}
 */
function validateAcademicRecord(record) {
  if (!record || typeof record !== 'object') {
    return { valid: false, error: 'Academic record must be an object' };
  }

  const { level, yearOfPassing, gradingSystem, score } = record;
  const allowedLevels = ['tenth', 'twelfth', 'diploma', 'bachelors', 'masters', 'doctorate', 'other'];

  if (!level || !allowedLevels.includes(level)) {
    return { valid: false, error: `Invalid qualification level. Supported: ${allowedLevels.join(', ')}` };
  }

  if (yearOfPassing !== undefined && yearOfPassing !== null) {
    const year = Number(yearOfPassing);
    const currentYear = new Date().getFullYear();
    if (isNaN(year) || year < 1980 || year > currentYear + 6) {
      return { valid: false, error: `Year of passing must be between 1980 and ${currentYear + 6}` };
    }
  }

  if (score && gradingSystem === 'percentage') {
    const numScore = parseFloat(String(score).replace('%', '').trim());
    if (isNaN(numScore) || numScore < 0 || numScore > 100) {
      return { valid: false, error: 'Percentage score must be a number between 0 and 100' };
    }
  }

  if (score && gradingSystem === 'cgpa_10') {
    const numScore = parseFloat(String(score).trim());
    if (isNaN(numScore) || numScore < 0 || numScore > 10) {
      return { valid: false, error: 'CGPA (10-point scale) must be a number between 0.0 and 10.0' };
    }
  }

  return { valid: true };
}

module.exports = {
  validateTestScore,
  validateAcademicRecord,
};
