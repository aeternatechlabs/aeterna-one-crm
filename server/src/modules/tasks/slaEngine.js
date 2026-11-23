const { TASK_PRIORITIES } = require('../../config/constants');

const BUSINESS_HOURS = {
  START_HOUR: 9,
  START_MINUTE: 30,
  END_HOUR: 18,
  END_MINUTE: 30,
  DAILY_WORK_MINUTES: 540, // 9 hours
};

const SLA_TARGET_MINUTES = {
  [TASK_PRIORITIES.URGENT]: 120, // 2 business hours
  [TASK_PRIORITIES.HIGH]: 240, // 4 business hours
  [TASK_PRIORITIES.MEDIUM]: 1440, // 24 business hours
  [TASK_PRIORITIES.LOW]: 2880, // 48 business hours
};

const SLA_STATUSES = {
  ON_TRACK: 'ON_TRACK',
  APPROACHING_BREACH: 'APPROACHING_BREACH',
  BREACHED: 'BREACHED',
};

const isWorkDay = (date) => {
  const day = date.getDay();
  return day !== 0; // Monday (1) through Saturday (6)
};

const calculateSlaDeadline = (startDate, priority) => {
  const targetMinutes = SLA_TARGET_MINUTES[priority] || SLA_TARGET_MINUTES[TASK_PRIORITIES.MEDIUM];
  let remainingMinutes = targetMinutes;
  const current = new Date(startDate);

  while (remainingMinutes > 0) {
    if (!isWorkDay(current)) {
      current.setDate(current.getDate() + 1);
      current.setHours(BUSINESS_HOURS.START_HOUR, BUSINESS_HOURS.START_MINUTE, 0, 0);
      continue;
    }

    const startToday = new Date(current);
    startToday.setHours(BUSINESS_HOURS.START_HOUR, BUSINESS_HOURS.START_MINUTE, 0, 0);

    const endToday = new Date(current);
    endToday.setHours(BUSINESS_HOURS.END_HOUR, BUSINESS_HOURS.END_MINUTE, 0, 0);

    if (current < startToday) {
      current.setTime(startToday.getTime());
    }

    if (current >= endToday) {
      current.setDate(current.getDate() + 1);
      current.setHours(BUSINESS_HOURS.START_HOUR, BUSINESS_HOURS.START_MINUTE, 0, 0);
      continue;
    }

    const availableToday = Math.max(0, Math.floor((endToday.getTime() - current.getTime()) / 60000));

    if (remainingMinutes <= availableToday) {
      current.setMinutes(current.getMinutes() + remainingMinutes);
      remainingMinutes = 0;
    } else {
      remainingMinutes -= availableToday;
      current.setDate(current.getDate() + 1);
      current.setHours(BUSINESS_HOURS.START_HOUR, BUSINESS_HOURS.START_MINUTE, 0, 0);
    }
  }

  return current;
};

const computeSlaStatus = (dueDate, now = new Date()) => {
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const remainingMinutes = Math.floor(diffMs / 60000);

  if (diffMs <= 0) {
    return {
      status: SLA_STATUSES.BREACHED,
      remainingMinutes: 0,
      isBreached: true,
      label: 'SLA Breached',
    };
  }

  if (remainingMinutes <= 30) {
    return {
      status: SLA_STATUSES.APPROACHING_BREACH,
      remainingMinutes,
      isBreached: false,
      label: `SLA Warning (${remainingMinutes}m left)`,
    };
  }

  return {
    status: SLA_STATUSES.ON_TRACK,
    remainingMinutes,
    isBreached: false,
    label: 'On Track',
  };
};

const checkEscalationEligibility = (task, now = new Date()) => {
  if (task.status === 'completed' || task.status === 'cancelled') {
    return false;
  }
  if (task.isEscalated) {
    return false;
  }
  const due = new Date(task.dueDate);
  return now.getTime() > due.getTime();
};

module.exports = {
  BUSINESS_HOURS,
  SLA_TARGET_MINUTES,
  SLA_STATUSES,
  calculateSlaDeadline,
  computeSlaStatus,
  checkEscalationEligibility,
};
