/**
 * Aeterna One CRM — KPI Dictionary & Reporting Definitions (Day 61)
 * Formal definitions for overseas education admissions, counselling velocity, and branch scorecards.
 */

const REPORTING_PERIODS = {
  DAYS_7: '7',
  DAYS_30: '30',
  DAYS_90: '90',
  YTD: 'ytd',
};

const KPI_DEFINITIONS = {
  LEAD_VOLUME: {
    id: 'lead_volume',
    name: 'Total Lead Volume',
    desc: 'Total candidate enquiries ingested within the reporting window.',
    numerator: 'COUNT(PipelineStudent) where createdAt >= startDate AND createdAt <= endDate',
    denominator: 'N/A (Raw Count)',
    unit: 'leads',
  },
  STAGE_CONVERSION_RATE: {
    id: 'stage_conversion_rate',
    name: 'Stage Conversion Rate',
    desc: 'Percentage of candidates progressing from the initial stage to a downstream milestone.',
    numerator: 'COUNT(candidates reaching stage N)',
    denominator: 'COUNT(total candidates in cohort)',
    unit: '%',
  },
  FUNNEL_DROPOFF_RATE: {
    id: 'funnel_dropoff_rate',
    name: 'Funnel Drop-off Rate',
    desc: 'Percentage of candidates who disengaged or were marked lost at a specific stage.',
    numerator: 'COUNT(candidates lost at stage N)',
    denominator: 'COUNT(candidates entering stage N)',
    unit: '%',
  },
  APPLICATION_TO_OFFER: {
    id: 'application_to_offer',
    name: 'Application-to-Offer Ratio',
    desc: 'Ratio of university offer letters received to university applications submitted.',
    numerator: 'COUNT(candidates in offer_received or beyond)',
    denominator: 'COUNT(candidates in submitted or beyond)',
    unit: '%',
  },
  VISA_SUCCESS_RATE: {
    id: 'visa_success_rate',
    name: 'Visa Success Rate',
    desc: 'Percentage of visa applications granted by immigration embassies out of total filed.',
    numerator: 'COUNT(candidates in enrolled / pre_departure / visa approved)',
    denominator: 'COUNT(candidates who filed visa applications)',
    unit: '%',
  },
  COUNSELLOR_VELOCITY: {
    id: 'counsellor_velocity',
    name: 'Daily Outreach Velocity',
    desc: 'Average number of smart reach-out interactions completed per counsellor per working day.',
    numerator: 'COUNT(completed outreach tasks)',
    denominator: 'Working Days in Period (excl. Sundays)',
    target: 25,
    unit: 'reachouts/day',
  },
  SLA_COMPLIANCE_RATE: {
    id: 'sla_compliance_rate',
    name: 'Task SLA Compliance Rate',
    desc: 'Percentage of operational tasks resolved within their defined business-hours SLA window.',
    numerator: 'COUNT(tasks where completedAt <= slaDeadline)',
    denominator: 'COUNT(total completed tasks)',
    unit: '%',
  },
};

/**
 * Calculates start and end timestamps in IST (+05:30) for a given reporting period
 * @param {string} period - '7', '30', '90', or 'ytd'
 * @param {Date} [referenceDate] - Optional reference date (defaults to now)
 * @returns {{ startDate: Date, endDate: Date, daysCount: number, periodLabel: string }}
 */
function getDateRange(period = '30', referenceDate = new Date()) {
  const endDate = new Date(referenceDate);
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date(referenceDate);
  let daysCount = 30;
  let periodLabel = 'Last 30 Days';

  switch (String(period).toLowerCase()) {
    case '7':
      daysCount = 7;
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      periodLabel = 'Last 7 Days';
      break;
    case '90':
      daysCount = 90;
      startDate.setDate(startDate.getDate() - 90);
      startDate.setHours(0, 0, 0, 0);
      periodLabel = 'Last 90 Days';
      break;
    case 'ytd': {
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
      const diffTime = Math.abs(endDate - startDate);
      daysCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      periodLabel = `Year to Date (${startDate.getFullYear()})`;
      break;
    }
    case '30':
    default:
      daysCount = 30;
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      periodLabel = 'Last 30 Days';
      break;
  }

  return { startDate, endDate, daysCount, periodLabel };
}

module.exports = {
  REPORTING_PERIODS,
  KPI_DEFINITIONS,
  getDateRange,
};
