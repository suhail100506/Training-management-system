import * as yup from 'yup';

// Login validation schema
export const loginSchema = yup.object().shape({
  email: yup.string().email('Must be a valid email').required('Email is required'),
  password: yup.string().required('Password is required')
});

// Change password validation schema
export const changePasswordSchema = yup.object().shape({
  currentPassword: yup.string().required('Current password is required'),
  newPassword: yup
    .string()
    .required('New password is required')
    .min(8, 'Password must be at least 8 characters long')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/\d/, 'Password must contain at least one number')
    .matches(/[@$!%*?&]/, 'Password must contain at least one special character (@$!%*?&)'),
  confirmPassword: yup
    .string()
    .required('Password confirmation is required')
    .oneOf([yup.ref('newPassword')], 'Passwords do not match')
});

// Staff validation schema
export const staffSchema = yup.object().shape({
  staffNumber: yup
    .string()
    .required('Staff Number is required')
    .matches(/^[a-zA-Z0-9-_]+$/, 'Staff Number must be alphanumeric'),
  staffName: yup.string().required('Staff Name is required'),
  emailId: yup.string().email('Must be a valid email').nullable().transform((v) => (v === '' ? null : v)),
  designation: yup.string().nullable(),
  groupName: yup.string().nullable(),
  productDivisionCategory: yup.string().nullable(),
  reportingGLManagerName: yup.string().nullable(),
  employmentStatus: yup
    .string()
    .required('Employment Status is required')
    .oneOf(['Currently Serving', 'Resigned', 'Retired'], 'Invalid employment status'),
  dateOfJoining: yup.date().nullable().typeError('Invalid date format').transform((v) => (v === '' ? null : v)),
  superannuationDate: yup.date().nullable().typeError('Invalid date format').transform((v) => (v === '' ? null : v))
});

// User validation schema (for admin creation by Super Admin)
export const userSchema = yup.object().shape({
  staffNumber: yup.string().required('Staff Number is required'),
  email: yup.string().email('Must be a valid email').required('Email is required'),
  role: yup.string().required('Role is required').oneOf(['admin', 'super_admin']),
  temporaryPassword: yup
    .string()
    .required('Temporary password is required')
    .min(8, 'Password must be at least 8 characters long')
});

// Core Training Record validation schema
export const trainingRecordSchema = yup.object().shape({
  staffNumber: yup.string().required('Staff Number is required'),
  groupName: yup.string().nullable(),
  trainingTopic: yup.string().required('Training Topic is required'),
  trainingModuleNumber: yup
    .string()
    .required('Module Number is required')
    .matches(/^[a-zA-Z0-9-_]+$/, 'Module Number must be alphanumeric (dashes and underscores are allowed)'),
  trainerName: yup.string().nullable(),
  trainingInstituteName: yup.string().nullable(),
  typeOfTraining: yup
    .string()
    .required('Type of Training is required'),
  trainingMode: yup
    .string()
    .required('Training Mode is required')
    .oneOf(['Online', 'Offline', 'Hybrid', 'Others']),
  trainingDurationHours: yup
    .number()
    .required('Duration is required')
    .typeError('Duration must be a number')
    .min(0, 'Duration cannot be negative'),
  startDateOfTraining: yup
    .date()
    .required('Start Date is required')
    .typeError('Invalid Start Date'),
  endDateOfTraining: yup
    .date()
    .required('End Date is required')
    .typeError('Invalid End Date')
    .min(yup.ref('startDateOfTraining'), 'End Date cannot be before Start Date of Training'),
  requestProcessedDate: yup
    .date()
    .nullable()
    .transform((curr, orig) => {
      if (orig === '' || orig === null || orig === undefined || orig === '-') {
        return null;
      }
      return curr;
    })
    .typeError('Invalid Request Processed Date')
    .test(
      'min-date',
      'Request Processed Date cannot be before Start Date of Training',
      function (value) {
        const { startDateOfTraining } = this.parent;
        if (!value || !startDateOfTraining) return true;
        return new Date(value) >= new Date(startDateOfTraining);
      }
    ),
  paymentDate: yup
    .date()
    .nullable()
    .transform((curr, orig) => {
      if (orig === '' || orig === null || orig === undefined || orig === '-') {
        return null;
      }
      return curr;
    })
    .typeError('Invalid Payment Date'),
  trainingStatus: yup
    .string()
    .required('Training Status is required')
    .oneOf(['Completed', 'Not Completed', 'Scheduled', 'In Progress', 'Cancelled']),
  trainingCostPerPerson: yup
    .number()
    .typeError('Cost must be a number')
    .min(0, 'Cost cannot be negative')
    .default(0),
  remarks: yup
    .string()
    .nullable()
    .transform((v) => (v === '' ? null : v))
});
