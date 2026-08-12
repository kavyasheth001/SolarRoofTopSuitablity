// Assessment Module — Shared Constants
// Co-located with Assessment components; imported where needed.

export const ASSESSMENT_STATUS = {
  SCHEDULED:   'SCHEDULED',
  ACCEPTED:    'ACCEPTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED:   'COMPLETED',
  CANCELLED:   'CANCELLED',
  RESCHEDULED: 'RESCHEDULED',
};

export const ASSESSMENT_PRIORITY = {
  HIGH:   'HIGH',
  MEDIUM: 'MEDIUM',
  LOW:    'LOW',
};

export const PRIORITY_COLORS = {
  HIGH:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  LOW:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export const PRIORITY_DOT = {
  HIGH:   'bg-red-500',
  MEDIUM: 'bg-amber-500',
  LOW:    'bg-green-500',
};

export const STATUS_COLORS = {
  SCHEDULED:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ACCEPTED:    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  COMPLETED:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED:   'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  RESCHEDULED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export const QUICK_FILTERS = [
  {
    id:      'high_outstanding',
    label:   'High Outstanding',
    icon:    '₹',
    color:   'text-red-600',
    filters: { outstanding_min: '2000000' },
  },
  {
    id:      'assessment_expired',
    label:   'Assessment Expired',
    icon:    '⚠',
    color:   'text-amber-600',
    filters: { assessment_expired: true },
  },
  {
    id:      'missing_sac',
    label:   'Missing SAC',
    icon:    '#',
    color:   'text-orange-600',
    filters: { missing_sac: true },
  },
  {
    id:      'never_assessed',
    label:   'Never Assessed',
    icon:    '○',
    color:   'text-purple-600',
    filters: { never_assessed: true },
  },
  {
    id:      'commercial',
    label:   'Commercial',
    icon:    '🏢',
    color:   'text-blue-600',
    filters: { bld_class: 'Commercial' },
  },
];

// Priority scoring rules (pure config — used by assessmentPriorityEngine)
export const PRIORITY_RULES = [
  { key: 'missingSac',        points: 40 },
  { key: 'neverAssessed',     points: 20 },
  { key: 'assessmentExpired', points: 30 },
  { key: 'veryHighOutstanding',  points: 25 },
  { key: 'highOutstanding',      points: 15 },
  { key: 'lowOutstanding',       points: 8  },
  { key: 'commercial',           points: 10 },
  { key: 'highRise',             points: 10 },
  { key: 'missingOutstandingInfo', points: 5 },
];
