const { ApiError } = require('../../utils/devilWrapper');
const {
  TASK_TYPES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  REACHOUT_CHANNELS,
  DISPOSITION_OUTCOMES,
  BRANCHES,
} = require('../../config/constants');

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const validateCreateTask = (data) => {
  const errors = [];

  if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
    errors.push('Task title is required.');
  } else if (data.title.trim().length > 200) {
    errors.push('Task title cannot exceed 200 characters.');
  }

  if (!data.candidateName || typeof data.candidateName !== 'string' || !data.candidateName.trim()) {
    errors.push('Candidate name is required.');
  }

  if (!data.dueDate) {
    errors.push('Due date is required.');
  } else {
    const parsedDate = new Date(data.dueDate);
    if (isNaN(parsedDate.getTime())) {
      errors.push('Due date must be a valid date.');
    }
  }

  if (data.taskType && !Object.values(TASK_TYPES).includes(data.taskType)) {
    errors.push(`Invalid task type. Must be one of: ${Object.values(TASK_TYPES).join(', ')}.`);
  }

  if (data.priority && !Object.values(TASK_PRIORITIES).includes(data.priority)) {
    errors.push(`Invalid priority. Must be one of: ${Object.values(TASK_PRIORITIES).join(', ')}.`);
  }

  if (data.assignedTo && !OBJECT_ID_REGEX.test(String(data.assignedTo))) {
    errors.push('Invalid assignedTo ID format.');
  }

  if (data.leadId && !OBJECT_ID_REGEX.test(String(data.leadId))) {
    errors.push('Invalid leadId format.');
  }

  if (data.studentId && !OBJECT_ID_REGEX.test(String(data.studentId))) {
    errors.push('Invalid studentId format.');
  }

  if (data.branch && ![BRANCHES.BENGALURU, BRANCHES.MYSURU, BRANCHES.BELAGAVI].includes(data.branch)) {
    errors.push(`Invalid branch. Must be one of: ${[BRANCHES.BENGALURU, BRANCHES.MYSURU, BRANCHES.BELAGAVI].join(', ')}.`);
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join(' '));
  }
};

const validateReachoutLog = (data) => {
  const errors = [];

  if (!data.channel || !Object.values(REACHOUT_CHANNELS).includes(data.channel)) {
    errors.push(`Valid channel is required (${Object.values(REACHOUT_CHANNELS).join(', ')}).`);
  }

  if (!data.outcomeCode || !Object.values(DISPOSITION_OUTCOMES).includes(data.outcomeCode)) {
    errors.push(`Valid outcomeCode is required (${Object.values(DISPOSITION_OUTCOMES).join(', ')}).`);
  }

  if (data.notes && typeof data.notes === 'string' && data.notes.length > 1000) {
    errors.push('Notes cannot exceed 1000 characters.');
  }

  if (data.nextFollowupHours !== undefined && data.nextFollowupHours !== null) {
    const hours = Number(data.nextFollowupHours);
    if (isNaN(hours) || hours <= 0 || hours > 720) {
      errors.push('Next follow-up hours must be a positive number between 1 and 720.');
    }
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join(' '));
  }
};

const validateCompleteTask = (data) => {
  const errors = [];

  if (!data.outcome || typeof data.outcome !== 'string' || !data.outcome.trim()) {
    errors.push('Task completion outcome is required.');
  }

  if (!data.notes || typeof data.notes !== 'string' || data.notes.trim().length < 5) {
    errors.push('Operational notes must be at least 5 characters to ensure audit integrity.');
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join(' '));
  }
};

module.exports = {
  validateCreateTask,
  validateReachoutLog,
  validateCompleteTask,
};
