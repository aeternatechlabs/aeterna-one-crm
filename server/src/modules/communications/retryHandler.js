const calculateExponentialBackoff = (attempt, baseMinutes = 5, maxMinutes = 1440) => {
  const safeAttempt = Math.max(1, parseInt(attempt, 10) || 1);
  const factor = Math.pow(2, safeAttempt - 1);
  const calculatedMinutes = Math.min(baseMinutes * factor, maxMinutes);

  const nextAttemptDate = new Date();
  nextAttemptDate.setMinutes(nextAttemptDate.getMinutes() + calculatedMinutes);

  return {
    nextAttemptDate,
    backoffMinutes: calculatedMinutes,
    attempt: safeAttempt,
  };
};

const generateDedupKey = (action, entityId, timestampWindowMs = 60000) => {
  const windowBucket = Math.floor(Date.now() / timestampWindowMs);
  return `${action}_${entityId}_${windowBucket}`;
};

module.exports = {
  calculateExponentialBackoff,
  generateDedupKey,
};
