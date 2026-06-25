const mongoose = require('mongoose');
const { EMPLOYMENT_STATUS, TRAINING_TYPES, TRAINING_MODES, TRAINING_STATUSES } = require('../config/constants');

const trainingRecordSchema = new mongoose.Schema({
  // Staff Info (denormalized)
  staffNumber: {
    type: String,
    required: true,
    index: true
  },
  staffName: String,
  emailId: String,
  designation: String,
  groupName: String,
  productDivisionCategory: String,
  reportingGLManagerName: String,
  employmentStatus: {
    type: String,
    enum: [
      EMPLOYMENT_STATUS.CURRENTLY_SERVING,
      EMPLOYMENT_STATUS.RESIGNED,
      EMPLOYMENT_STATUS.RETIRED
    ]
  },
  dateOfJoining: Date,
  superannuationDate: Date,

  // Training Info
  trainingTopic: {
    type: String,
    required: true
  },
  trainingModuleNumber: {
    type: String,
    required: true,
    index: true
  },
  trainerName: String,
  trainingInstituteName: String,
  typeOfTraining: {
    type: String,
    enum: Object.values(TRAINING_TYPES),
    required: true
  },
  trainingMode: {
    type: String,
    enum: Object.values(TRAINING_MODES),
    required: true
  },
  trainingDurationHours: {
    type: Number,
    required: true,
    min: 0
  },
  startDateOfTraining: {
    type: Date,
    required: true,
    index: true
  },
  endDateOfTraining: {
    type: Date,
    required: true
  },
  requestProcessedDate: {
    type: Date,
    required: false,
    index: true
  },
  paymentDate: {
    type: Date,
    required: false,
    index: true
  },
  trainingStatus: {
    type: String,
    enum: Object.values(TRAINING_STATUSES),
    required: true,
    index: true
  },
  trainingCostPerPerson: {
    type: Number,
    default: 0
  },
  remarks: {
    type: String,
    required: false
  },

  // Meta
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  uploadBatchId: {
    type: String,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// COMPOUND UNIQUE INDEX to prevent duplicate training records for active entries
trainingRecordSchema.index(
  { staffNumber: 1, trainingModuleNumber: 1, startDateOfTraining: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

module.exports = mongoose.model('TrainingRecord', trainingRecordSchema);
