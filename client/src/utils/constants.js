export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin'
};

export const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'Currently Serving', label: 'Currently Serving' },
  { value: 'Resigned', label: 'Resigned' },
  { value: 'Retired', label: 'Retired' }
];

export const TRAINING_TYPE_OPTIONS = [
  { value: 'OT', label: 'OT' },
  { value: 'ILT', label: 'ILT' },
  { value: 'Blended', label: 'Blended' },
  { value: 'Training for external members', label: 'Training for external members' },
  { value: 'Group specific', label: 'Group specific' },
  { value: 'Others', label: 'Others' }
];

export const TRAINING_MODE_OPTIONS = [
  { value: 'Online', label: 'Online' },
  { value: 'Offline', label: 'Offline' },
  { value: 'Hybrid', label: 'Hybrid' },
  { value: 'Others', label: 'Others' }
];

export const TRAINING_STATUS_OPTIONS = [
  { value: 'Completed', label: 'Completed' },
  { value: 'Not Completed', label: 'Not Completed' },
  { value: 'Scheduled', label: 'Scheduled' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Cancelled', label: 'Cancelled' }
];

export const getFinancialYearOptions = () => {
  const startYear = 2021;
  const currentYear = new Date().getFullYear();
  const endYear = Math.max(2028, currentYear + 5);
  const options = [];
  for (let year = startYear; year <= endYear; year++) {
    const nextYearShort = String(year + 1).slice(-2);
    options.push(`FY ${year}-${nextYearShort}`);
  }
  return options;
};

export const getCurrentFinancialYear = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const startYear = currentMonth >= 3 ? currentYear : currentYear - 1;
  const nextYearShort = String(startYear + 1).slice(-2);
  return `FY ${startYear}-${nextYearShort}`;
};
