/**
 * constants.js
 * Application constants, UIP reference schedule, and reminder rules.
 */

const GRACE_PERIOD_DAYS = 14;

const ROLES = {
  PARENT: 'parent',
  STAFF: 'staff',
  ADMIN: 'admin'
};

const CONSENT_VERSION = 'v1.0';

const RISK_CATEGORIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

const REMINDER_STRATEGIES = {
  STANDARD: 'standard',
  ENHANCED: 'enhanced',
  INTENSIVE: 'intensive'
};

const CHANNELS = {
  WEB_APP: 'web_app',
  EMAIL: 'email',
  WHATSAPP: 'whatsapp'
};

const DELIVERY_MODES = {
  LIVE: 'live',
  MOCK: 'mock',
  FAILED: 'failed'
};

/**
 * Cadence rule matrix based on days until or past due date:
 * - >= 7 days before due date: WhatsApp only
 * - 2 to 3 days before due date: WhatsApp + SMS
 * - Due date (0 to 1 day before/on due date): WhatsApp + SMS
 * - Overdue (> 0 days past due date): WhatsApp + SMS (with urgent high-risk escalation)
 */
const CHANNEL_ESCALATION_RULES = [
  {
    minDaysUntilDue: 7,
    maxDaysUntilDue: Infinity,
    name: 'advance_notice',
    channels: ['whatsapp', 'email']
  },
  {
    minDaysUntilDue: 2,
    maxDaysUntilDue: 6,
    name: 'upcoming_reminder',
    channels: ['whatsapp', 'email']
  },
  {
    minDaysUntilDue: 0,
    maxDaysUntilDue: 1,
    name: 'due_date_reminder',
    channels: ['whatsapp', 'email']
  },
  {
    minDaysUntilDue: -Infinity,
    maxDaysUntilDue: -1,
    name: 'overdue_escalation',
    channels: ['whatsapp', 'email'],
    immediateOutOfCycleIfHighRisk: true
  }
];

/**
 * India's Universal Immunization Programme (UIP) National Schedule
 * Real reference data.
 */
const UIP_VACCINE_SCHEDULE = [
  // Birth doses
  {
    vaccineCode: 'BCG',
    vaccineName: 'Bacillus Calmette-Guérin',
    doseNumber: 1,
    antigenGroup: 'Tuberculosis',
    dueAgeDays: 0,
    dueAgeLabel: 'At birth (up to 1 year)',
    upperLimitAgeDays: 365,
    route: 'Intradermal',
    site: 'Left upper arm',
    endemicDistrictsOnly: false,
    effectiveFrom: new Date('2020-01-01')
  },
  {
    vaccineCode: 'OPV-0',
    vaccineName: 'Oral Polio Vaccine - Birth Dose',
    doseNumber: 0,
    antigenGroup: 'Polio',
    dueAgeDays: 0,
    dueAgeLabel: 'At birth (within 15 days)',
    upperLimitAgeDays: 15,
    route: 'Oral',
    site: 'Oral',
    endemicDistrictsOnly: false,
    effectiveFrom: new Date('2020-01-01')
  },
  {
    vaccineCode: 'HepB-0',
    vaccineName: 'Hepatitis B - Birth Dose',
    doseNumber: 0,
    antigenGroup: 'Hepatitis B',
    dueAgeDays: 0,
    dueAgeLabel: 'At birth (within 24 hours)',
    upperLimitAgeDays: 1,
    route: 'Intramuscular',
    site: 'Anterolateral aspect of mid-thigh (Left)',
    endemicDistrictsOnly: false,
    effectiveFrom: new Date('2020-01-01')
  },

  // 6 Weeks (42 days)
  {
    vaccineCode: 'OPV-1',
    vaccineName: 'Oral Polio Vaccine - Dose 1',
    doseNumber: 1,
    antigenGroup: 'Polio',
    dueAgeDays: 42,
    dueAgeLabel: '6 Weeks',
    upperLimitAgeDays: 1825,
    route: 'Oral',
    site: 'Oral',
    endemicDistrictsOnly: false,
    effectiveFrom: new Date('2020-01-01')
  },
  {
    vaccineCode: 'Penta-1',
    vaccineName: 'Pentavalent Vaccine (DPT+HepB+Hib) - Dose 1',
    doseNumber: 1,
    antigenGroup: 'Pentavalent',
    dueAgeDays: 42,
    dueAgeLabel: '6 Weeks',
    upperLimitAgeDays: 365,
    route: 'Intramuscular',
    site: 'Anterolateral mid-thigh (Left)',
    endemicDistrictsOnly: false,
    effectiveFrom: new Date('2020-01-01')
  },
  {
    vaccineCode: 'Rota-1',
    vaccineName: 'Rotavirus Vaccine - Dose 1',
    doseNumber: 1,
    antigenGroup: 'Rotavirus',
    dueAgeDays: 42,
    dueAgeLabel: '6 Weeks',
    upperLimitAgeDays: 365,
    route: 'Oral',
    site: 'Oral',
    endemicDistrictsOnly: false,
    effectiveFrom: new Date('2020-01-01')
  },
  {
    vaccineCode: 'fIPV-1',
    vaccineName: 'Fractional Inactivated Polio Vaccine - Dose 1',
    doseNumber: 1,
    antigenGroup: 'Polio',
    dueAgeDays: 42,
    dueAgeLabel: '6 Weeks',
    upperLimitAgeDays: 365,
    route: 'Intradermal',
    site: 'Right upper arm',
    endemicDistrictsOnly: false,
    effectiveFrom: new Date('2020-01-01')
  },
  {
    vaccineCode: 'PCV-1',
    vaccineName: 'Pneumococcal Conjugate Vaccine - Dose 1',
    doseNumber: 1,
    antigenGroup: 'Pneumococcal',
    dueAgeDays: 42,
    dueAgeLabel: '6 Weeks',
    upperLimitAgeDays: 365,
    route: 'Intramuscular',
    site: 'Anterolateral mid-thigh (Right)',
    endemicDistrictsOnly: false,
    effectiveFrom: new Date('2020-01-01')
  },

  // 10 Weeks (70 days)
  {
    vaccineCode: 'OPV-2',
    vaccineName: 'Oral Polio Vaccine - Dose 2',
    doseNumber: 2,
    antigenGroup: 'Polio',
    dueAgeDays: 70,
    dueAgeLabel: '10 Weeks',
    upperLimitAgeDays: 1825,
    route: 'Oral',
    site: 'Oral',
    endemicDistrictsOnly: false,
    effectiveFrom: new Date('2020-01-01')
  },
  {
    vaccineCode: 'Penta-2',
    vaccineName: 'Pentavalent Vaccine - Dose 2',
    doseNumber: 2,
    antigenGroup: 'Pentavalent',
    dueAgeDays: 70,
    dueAgeLabel: '10 Weeks',
    upperLimitAgeDays: 365,
    route: 'Intramuscular',
    site: 'Anterolateral mid-thigh (Left)',
    endemicDistrictsOnly: false,
    effectiveFrom: new Date('2020-01-01')
  },
  {
    vaccineCode: 'Rota-2',
    vaccineName: 'Rotavirus Vaccine - Dose 2',
    doseNumber: 2,
    antigenGroup: 'Rotavirus',
    dueAgeDays: 70,
    dueAgeLabel: '10 Weeks',
    upperLimitAgeDays: 365,
    route: 'Oral',
    site: 'Oral',
    endemicDistrictsOnly: false,
    effectiveFrom: new Date('2020-01-01')
  },

  // 14 Weeks (98 days)
  {
    vaccineCode: 'OPV-3',
    vaccineName: 'Oral Polio Vaccine - Dose 3',
    doseNumber: 3,
    antigenGroup: 'Polio',
    dueAgeDays: 98,
    dueAgeLabel: '14 Weeks',
    upperLimitAgeDays: 1825,
    route: 'Oral',
    site: 'Oral',
    endemicDistrictsOnly: false,
    effectiveFrom: new Date('2020-01-01')
  },
  {
    vaccineCode: 'Penta-3',
    vaccineName: 'Pentavalent Vaccine - Dose 3',
    doseNumber: 3,
    antigenGroup: 'Pentavalent',
    dueAgeDays: 98,
    dueAgeLabel: '14 Weeks',
    upperLimitAgeDays: 365,
    route: 'Intramuscular',
    site: 'Anterolateral mid-thigh (Left)',
    endemicDistrictsOnly: false,
    effectiveFrom: new Date('2020-01-01')
  },
  {
    vaccineCode: 'Rota-3',
    vaccineName: 'Rotavirus Vaccine - Dose 3',
    doseNumber: 3,
    antigenGroup: 'Rotavirus',
    dueAgeDays: 98,
    dueAgeLabel: '14 Weeks',
    upperLimitAgeDays: 365,
    route: 'Oral',
    site: 'Oral',
    endemicDistrictsOnly: false,
    effectiveFrom: new Date('2020-01-01')
  },
  {
    vaccineCode: 'fIPV-2',
    vaccineName: 'Fractional Inactivated Polio Vaccine - Dose 2',
    doseNumber: 2,
    antigenGroup: 'Polio',
    dueAgeDays: 98,
    dueAgeLabel: '14 Weeks',
    upperLimitAgeDays: 365,
    route: 'Intradermal',
    site: 'Right upper arm',
    endemicDistrictsOnly: false,
    effectiveFrom: new Date('2020-01-01')
  },
  {
    vaccineCode: 'PCV-2',
    vaccineName: 'Pneumococcal Conjugate Vaccine - Dose 2',
    doseNumber: 2,
    antigenGroup: 'Pneumococcal',
    dueAgeDays: 98,
    dueAgeLabel: '14 Weeks',
    upperLimitAgeDays: 365,
    route: 'Intramuscular',
    site: 'Anterolateral mid-thigh (Right)',
    endemicDistrictsOnly: false,
    effectiveFrom: new Date('2020-01-01')
  },

  // 9-12 Months (270 days)
  {
    vaccineCode: 'MR-1',
    vaccineName: 'Measles & Rubella - Dose 1',
    doseNumber: 1,
    antigenGroup: 'Measles-Rubella',
    dueAgeDays: 270,
    dueAgeLabel: '9-12 Months',
    upperLimitAgeDays: 1825,
    route: 'Subcutaneous',
    site: 'Right upper arm',
    endemicDistrictsOnly: false,
    effectiveFrom: new Date('2020-01-01')
  },
  {
    vaccineCode: 'JE-1',
    vaccineName: 'Japanese Encephalitis - Dose 1',
    doseNumber: 1,
    antigenGroup: 'Japanese Encephalitis',
    dueAgeDays: 270,
    dueAgeLabel: '9-12 Months (Endemic districts)',
    upperLimitAgeDays: 1825,
    route: 'Subcutaneous',
    site: 'Left upper arm',
    endemicDistrictsOnly: true,
    effectiveFrom: new Date('2020-01-01')
  },
  {
    vaccineCode: 'PCV-B',
    vaccineName: 'Pneumococcal Conjugate Vaccine - Booster',
    doseNumber: 3,
    antigenGroup: 'Pneumococcal',
    dueAgeDays: 270,
    dueAgeLabel: '9-12 Months',
    upperLimitAgeDays: 1825,
    route: 'Intramuscular',
    site: 'Anterolateral mid-thigh (Right)',
    endemicDistrictsOnly: false,
    effectiveFrom: new Date('2020-01-01')
  },
  {
    vaccineCode: 'VitA-1',
    vaccineName: 'Vitamin A - Dose 1 (100,000 IU)',
    doseNumber: 1,
    antigenGroup: 'Vitamin A',
    dueAgeDays: 270,
    dueAgeLabel: '9-12 Months',
    upperLimitAgeDays: 1825,
    route: 'Oral',
    site: 'Oral',
    endemicDistrictsOnly: false,
    effectiveFrom: new Date('2020-01-01')
  },

  // 16-24 Months (480 days)
  {
    vaccineCode: 'MR-2',
    vaccineName: 'Measles & Rubella - Dose 2',
    doseNumber: 2,
    antigenGroup: 'Measles-Rubella',
    dueAgeDays: 480,
    dueAgeLabel: '16-24 Months',
    upperLimitAgeDays: 1825,
    route: 'Subcutaneous',
    site: 'Right upper arm',
    endemicDistrictsOnly: false,
    effectiveFrom: new Date('2020-01-01')
  },
  {
    vaccineCode: 'JE-2',
    vaccineName: 'Japanese Encephalitis - Dose 2',
    doseNumber: 2,
    antigenGroup: 'Japanese Encephalitis',
    dueAgeDays: 480,
    dueAgeLabel: '16-24 Months (Endemic districts)',
    upperLimitAgeDays: 1825,
    route: 'Subcutaneous',
    site: 'Left upper arm',
    endemicDistrictsOnly: true,
    effectiveFrom: new Date('2020-01-01')
  },
  {
    vaccineCode: 'DPT-B1',
    vaccineName: 'Diphtheria, Pertussis, Tetanus - Booster 1',
    doseNumber: 1,
    antigenGroup: 'DPT',
    dueAgeDays: 480,
    dueAgeLabel: '16-24 Months',
    upperLimitAgeDays: 2555,
    route: 'Intramuscular',
    site: 'Anterolateral mid-thigh (Left)',
    endemicDistrictsOnly: false,
    effectiveFrom: new Date('2020-01-01')
  },
  {
    vaccineCode: 'OPV-B',
    vaccineName: 'Oral Polio Vaccine - Booster',
    doseNumber: 4,
    antigenGroup: 'Polio',
    dueAgeDays: 480,
    dueAgeLabel: '16-24 Months',
    upperLimitAgeDays: 1825,
    route: 'Oral',
    site: 'Oral',
    endemicDistrictsOnly: false,
    effectiveFrom: new Date('2020-01-01')
  },
  {
    vaccineCode: 'VitA-2',
    vaccineName: 'Vitamin A - Dose 2 (200,000 IU)',
    doseNumber: 2,
    antigenGroup: 'Vitamin A',
    dueAgeDays: 480,
    dueAgeLabel: '16-24 Months',
    upperLimitAgeDays: 1825,
    route: 'Oral',
    site: 'Oral',
    endemicDistrictsOnly: false,
    effectiveFrom: new Date('2020-01-01')
  },

  // 5-6 Years (1825 days)
  {
    vaccineCode: 'DPT-B2',
    vaccineName: 'Diphtheria, Pertussis, Tetanus - Booster 2',
    doseNumber: 2,
    antigenGroup: 'DPT',
    dueAgeDays: 1825,
    dueAgeLabel: '5-6 Years',
    upperLimitAgeDays: 2555,
    route: 'Intramuscular',
    site: 'Left upper arm (Deltoid)',
    endemicDistrictsOnly: false,
    effectiveFrom: new Date('2020-01-01')
  },

  // 10 Years (3650 days)
  {
    vaccineCode: 'Td-10',
    vaccineName: 'Tetanus & Adult Diphtheria - 10 Years',
    doseNumber: 1,
    antigenGroup: 'Td',
    dueAgeDays: 3650,
    dueAgeLabel: '10 Years',
    upperLimitAgeDays: 5840,
    route: 'Intramuscular',
    site: 'Upper arm (Deltoid)',
    endemicDistrictsOnly: false,
    effectiveFrom: new Date('2020-01-01')
  },

  // 16 Years (5840 days)
  {
    vaccineCode: 'Td-16',
    vaccineName: 'Tetanus & Adult Diphtheria - 16 Years',
    doseNumber: 2,
    antigenGroup: 'Td',
    dueAgeDays: 5840,
    dueAgeLabel: '16 Years',
    upperLimitAgeDays: 7300,
    route: 'Intramuscular',
    site: 'Upper arm (Deltoid)',
    endemicDistrictsOnly: false,
    effectiveFrom: new Date('2020-01-01')
  }
];

module.exports = {
  GRACE_PERIOD_DAYS,
  ROLES,
  CONSENT_VERSION,
  RISK_CATEGORIES,
  REMINDER_STRATEGIES,
  CHANNELS,
  DELIVERY_MODES,
  CHANNEL_ESCALATION_RULES,
  UIP_VACCINE_SCHEDULE
};
