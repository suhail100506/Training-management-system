const TrainingRecord = require('../models/TrainingRecord');
const Staff = require('../models/Staff');
const { logAudit, logAuditBulk } = require('../middleware/auditLogger');
const { AUDIT_ACTIONS } = require('../config/constants');
const { getPaginationOptions, getPaginationMeta } = require('../utils/pagination');
const { startOfFY, endOfFY } = require('../utils/dateHelpers');
const { sendSuccess, sendError } = require('../utils/response');

// Normalize Date to UTC midnight
const normalizeDateToUTC = (dateVal) => {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
};

// @desc    List all training records (paginated with rich filtering)
// @route   GET /api/v1/training
// @access  Private (Admin + Super Admin)
const getTrainingRecords = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationOptions(req.query);
    const {
      staffNumber,
      startDate,
      endDate,
      type,
      mode,
      status,
      group,
      division,
      month,
      quarter,
      financialYear,
      search,
      filterOperator,
      trainingTopic,
      trainingModuleNumber
    } = req.query;

    const query = { isDeleted: false };
    const operator = filterOperator === 'or' ? 'or' : 'and';

    if (operator === 'or') {
      const conditions = [];

      if (staffNumber) {
        conditions.push({ staffNumber });
      }
      if (type) {
        conditions.push({ typeOfTraining: type });
      }
      if (mode) {
        conditions.push({ trainingMode: mode });
      }
      if (status) {
        conditions.push({ trainingStatus: status });
      }
      if (group) {
        conditions.push({ groupName: group });
      }
      if (division) {
        conditions.push({ productDivisionCategory: division });
      }
      if (trainingTopic) {
        conditions.push({ trainingTopic: new RegExp(trainingTopic, 'i') });
      }
      if (trainingModuleNumber) {
        conditions.push({ trainingModuleNumber: { $regex: `^${trainingModuleNumber.trim()}$`, $options: 'i' } });
      }

      if (search) {
        const searchRegex = new RegExp(search, 'i');
        conditions.push({
          $or: [
            { staffName: searchRegex },
            { staffNumber: searchRegex },
            { trainingTopic: searchRegex }
          ]
        });
      }

      if (startDate || endDate) {
        const cond = {};
        if (startDate) cond.$gte = new Date(startDate);
        if (endDate) cond.$lte = new Date(endDate);
        conditions.push({ startDateOfTraining: cond });
      }

      if (financialYear && financialYear !== 'all') {
        const start = startOfFY(financialYear);
        const end = endOfFY(financialYear);
        if (start && end) {
          conditions.push({ startDateOfTraining: { $gte: start, $lte: end } });
        }
      }

      if (quarter) {
        let startYear;
        if (financialYear) {
          const match = financialYear.match(/FY (\d{4})-\d{2}/);
          if (match) startYear = parseInt(match[1], 10);
        }
        if (!startYear) {
          const now = new Date();
          const monthNow = now.getMonth();
          startYear = monthNow >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        }

        let qStart, qEnd;
        if (quarter === 'Q1') {
          qStart = new Date(Date.UTC(startYear, 3, 1));
          qEnd = new Date(Date.UTC(startYear, 5, 30, 23, 59, 59, 999));
        } else if (quarter === 'Q2') {
          qStart = new Date(Date.UTC(startYear, 6, 1));
          qEnd = new Date(Date.UTC(startYear, 8, 30, 23, 59, 59, 999));
        } else if (quarter === 'Q3') {
          qStart = new Date(Date.UTC(startYear, 9, 1));
          qEnd = new Date(Date.UTC(startYear, 11, 31, 23, 59, 59, 999));
        } else if (quarter === 'Q4') {
          qStart = new Date(Date.UTC(startYear + 1, 0, 1));
          qEnd = new Date(Date.UTC(startYear + 1, 2, 31, 23, 59, 59, 999));
        }

        if (qStart && qEnd) {
          conditions.push({ startDateOfTraining: { $gte: qStart, $lte: qEnd } });
        }
      }

      if (month) {
        const monthIndex = parseInt(month, 10) - 1;
        let startYear;
        if (financialYear) {
          const match = financialYear.match(/FY (\d{4})-\d{2}/);
          if (match) {
            const fyStart = parseInt(match[1], 10);
            startYear = monthIndex < 3 ? fyStart + 1 : fyStart;
          }
        }
        if (!startYear) {
          startYear = new Date().getFullYear();
        }

        const mStart = new Date(Date.UTC(startYear, monthIndex, 1));
        const mEnd = new Date(Date.UTC(startYear, monthIndex + 1, 0, 23, 59, 59, 999));

        conditions.push({ startDateOfTraining: { $gte: mStart, $lte: mEnd } });
      }

      if (conditions.length > 0) {
        query.$or = conditions;
      }
    } else {
      // Standard filters (AND mode)
      if (staffNumber) {
        query.staffNumber = staffNumber;
      }
      if (type) {
        query.typeOfTraining = type;
      }
      if (mode) {
        query.trainingMode = mode;
      }
      if (status) {
        query.trainingStatus = status;
      }
      if (group) {
        query.groupName = group;
      }
      if (division) {
        query.productDivisionCategory = division;
      }
      if (trainingTopic) {
        query.trainingTopic = new RegExp(trainingTopic, 'i');
      }
      if (trainingModuleNumber) {
        query.trainingModuleNumber = { $regex: `^${trainingModuleNumber.trim()}$`, $options: 'i' };
      }

      // Free text search across staffName, staffNumber, trainingTopic
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        query.$or = [
          { staffName: searchRegex },
          { staffNumber: searchRegex },
          { trainingTopic: searchRegex }
        ];
      }

      // Date range filter
      if (startDate || endDate) {
        query.startDateOfTraining = {};
        if (startDate) {
          query.startDateOfTraining.$gte = new Date(startDate);
        }
        if (endDate) {
          query.startDateOfTraining.$lte = new Date(endDate);
        }
      }

      // Financial Year filter
      if (financialYear && financialYear !== 'all') {
        const start = startOfFY(financialYear);
        const end = endOfFY(financialYear);
        if (start && end) {
          query.startDateOfTraining = {
            ...query.startDateOfTraining,
            $gte: start,
            $lte: end
          };
        }
      }

      // Quarter filter (Indian Quarters: Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar)
      if (quarter) {
        let startYear;
        if (financialYear) {
          const match = financialYear.match(/FY (\d{4})-\d{2}/);
          if (match) startYear = parseInt(match[1], 10);
        }
        if (!startYear) {
          const now = new Date();
          const monthNow = now.getMonth();
          startYear = monthNow >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        }

        let qStart, qEnd;
        if (quarter === 'Q1') {
          qStart = new Date(Date.UTC(startYear, 3, 1));
          qEnd = new Date(Date.UTC(startYear, 5, 30, 23, 59, 59, 999));
        } else if (quarter === 'Q2') {
          qStart = new Date(Date.UTC(startYear, 6, 1));
          qEnd = new Date(Date.UTC(startYear, 8, 30, 23, 59, 59, 999));
        } else if (quarter === 'Q3') {
          qStart = new Date(Date.UTC(startYear, 9, 1));
          qEnd = new Date(Date.UTC(startYear, 11, 31, 23, 59, 59, 999));
        } else if (quarter === 'Q4') {
          qStart = new Date(Date.UTC(startYear + 1, 0, 1));
          qEnd = new Date(Date.UTC(startYear + 1, 2, 31, 23, 59, 59, 999));
        }

        if (qStart && qEnd) {
          query.startDateOfTraining = {
            ...query.startDateOfTraining,
            $gte: qStart,
            $lte: qEnd
          };
        }
      }

      // Month filter (1-12 range)
      if (month) {
        const monthIndex = parseInt(month, 10) - 1;
        let startYear;
        if (financialYear) {
          const match = financialYear.match(/FY (\d{4})-\d{2}/);
          if (match) {
            const fyStart = parseInt(match[1], 10);
            startYear = monthIndex < 3 ? fyStart + 1 : fyStart;
          }
        }
        if (!startYear) {
          startYear = new Date().getFullYear();
        }

        const mStart = new Date(Date.UTC(startYear, monthIndex, 1));
        const mEnd = new Date(Date.UTC(startYear, monthIndex + 1, 0, 23, 59, 59, 999));

        query.startDateOfTraining = {
          ...query.startDateOfTraining,
          $gte: mStart,
          $lte: mEnd
        };
      }
    }

    const total = await TrainingRecord.countDocuments(query);
    const records = await TrainingRecord.find(query)
      .sort({ startDateOfTraining: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const pagination = getPaginationMeta(total, page, limit);

    return sendSuccess(res, 'Training records fetched successfully', records, pagination);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a single training record (with duplicate checks)
// @route   POST /api/v1/training
// @access  Private (Admin + Super Admin)
const createTrainingRecord = async (req, res, next) => {
  try {
    const {
      staffNumber,
      groupName,
      trainingTopic,
      trainingModuleNumber,
      trainerName,
      trainingInstituteName,
      typeOfTraining,
      trainingMode,
      trainingDurationHours,
      startDateOfTraining,
      endDateOfTraining,
      requestProcessedDate,
      paymentDate,
      trainingStatus,
      trainingCostPerPerson,
      remarks
    } = req.body;

    // Validate request
    if (
      !staffNumber ||
      !trainingTopic ||
      !trainingModuleNumber ||
      !typeOfTraining ||
      !trainingMode ||
      !trainingDurationHours ||
      !startDateOfTraining ||
      !endDateOfTraining ||
      !trainingStatus
    ) {
      return sendError(res, 'All required training fields are missing', [], 400);
    }

    // 1. Fetch Staff Master Data to auto-fill read-only properties
    const staff = await Staff.findOne({ staffNumber, isDeleted: false });
    if (!staff) {
      return sendError(res, 'Staff member does not exist in Staff Master List', [
        { field: 'staffNumber', message: 'Staff number not found in master records' }
      ], 404);
    }

    // Validate module alphanumeric
    const moduleRegex = /^[a-zA-Z0-9-_]+$/;
    if (!moduleRegex.test(trainingModuleNumber)) {
      return sendError(res, 'Training Module Number must be alphanumeric (dashes and underscores are allowed)', [
        { field: 'trainingModuleNumber', message: 'Module number is invalid' }
      ], 400);
    }

    // Dates validations
    const start = normalizeDateToUTC(startDateOfTraining);
    const end = normalizeDateToUTC(endDateOfTraining);
    
    let processed = null;
    if (requestProcessedDate && requestProcessedDate !== '-') {
      processed = normalizeDateToUTC(requestProcessedDate);
    }

    let payment = null;
    if (paymentDate && paymentDate !== '-') {
      payment = normalizeDateToUTC(paymentDate);
    }

    if (end < start) {
      return sendError(res, 'End Date of Training cannot be before Start Date of Training', [
        { field: 'endDateOfTraining', message: 'End date cannot be before start date' }
      ], 400);
    }

    if (processed && processed < start) {
      return sendError(res, 'Request Processed Date cannot be before Start Date of Training', [
        { field: 'requestProcessedDate', message: 'Request processed date cannot be before start date' }
      ], 400);
    }

    if (parseFloat(trainingDurationHours) < 0) {
      return sendError(res, 'Training Duration cannot be negative', [
        { field: 'trainingDurationHours', message: 'Duration must be >= 0' }
      ], 400);
    }

    // 2. Perform duplicate check: staffNumber + trainingModuleNumber + startDateOfTraining
    const duplicate = await TrainingRecord.findOne({
      staffNumber,
      trainingModuleNumber,
      startDateOfTraining: start,
      isDeleted: false
    });

    if (duplicate) {
      return sendError(
        res,
        'A record for this Staff + Module + Start Date already exists. Please verify.',
        [{ field: 'staffNumber', message: 'Duplicate training record detected' }],
        409
      );
    }

    // 3. Assemble document with denormalized staff info
    const newRecord = new TrainingRecord({
      // denormalized staff info
      staffNumber,
      staffName: staff.staffName,
      emailId: staff.emailId,
      designation: staff.designation,
      groupName: groupName || staff.groupName,
      productDivisionCategory: staff.productDivisionCategory,
      reportingGLManagerName: staff.reportingGLManagerName,
      employmentStatus: staff.employmentStatus,
      dateOfJoining: staff.dateOfJoining,
      superannuationDate: staff.superannuationDate,

      // training details
      trainingTopic,
      trainingModuleNumber,
      trainerName,
      trainingInstituteName,
      typeOfTraining,
      trainingMode,
      trainingDurationHours,
      startDateOfTraining: start,
      endDateOfTraining: end,
      requestProcessedDate: processed,
      paymentDate: payment,
      trainingStatus,
      trainingCostPerPerson: trainingCostPerPerson || 0,
      remarks: remarks || '',
      createdBy: req.user._id
    });

    await newRecord.save();

    await logAudit({
      userId: req.user._id,
      userEmail: req.user.email,
      action: AUDIT_ACTIONS.CREATE,
      module: 'TrainingRecord',
      recordId: newRecord._id,
      after: newRecord.toObject(),
      ipAddress: req.ip
    });

    return sendSuccess(res, 'Training record created successfully', newRecord, null, 201);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single training record details
// @route   GET /api/v1/training/:id
// @access  Private (Admin + Super Admin)
const getTrainingRecordById = async (req, res, next) => {
  try {
    const record = await TrainingRecord.findById(req.params.id);
    if (!record || record.isDeleted) {
      return sendError(res, 'Training record not found', [], 404);
    }
    return sendSuccess(res, 'Training record fetched successfully', record);
  } catch (error) {
    next(error);
  }
};

// @desc    Edit a training record
// @route   PUT /api/v1/training/:id
// @access  Private (Admin + Super Admin)
const updateTrainingRecord = async (req, res, next) => {
  try {
    const record = await TrainingRecord.findById(req.params.id);
    if (!record || record.isDeleted) {
      return sendError(res, 'Training record not found', [], 404);
    }

    const {
      groupName,
      trainingTopic,
      trainingModuleNumber,
      trainerName,
      trainingInstituteName,
      typeOfTraining,
      trainingMode,
      trainingDurationHours,
      startDateOfTraining,
      endDateOfTraining,
      requestProcessedDate,
      paymentDate,
      trainingStatus,
      trainingCostPerPerson,
      remarks
    } = req.body;

    const before = record.toObject();

    // Validations
    if (startDateOfTraining || trainingModuleNumber) {
      const targetStart = startDateOfTraining ? normalizeDateToUTC(startDateOfTraining) : record.startDateOfTraining;
      const targetModule = trainingModuleNumber || record.trainingModuleNumber;

      // Duplicate check (excluding current record ID)
      const duplicate = await TrainingRecord.findOne({
        _id: { $ne: record._id },
        staffNumber: record.staffNumber,
        trainingModuleNumber: targetModule,
        startDateOfTraining: targetStart,
        isDeleted: false
      });

      if (duplicate) {
        return sendError(
          res,
          'A record for this Staff + Module + Start Date already exists. Please verify.',
          [{ field: 'staffNumber', message: 'Duplicate record exists' }],
          409
        );
      }
    }

    // Date logical order check
    const start = startDateOfTraining ? normalizeDateToUTC(startDateOfTraining) : record.startDateOfTraining;
    const end = endDateOfTraining ? normalizeDateToUTC(endDateOfTraining) : record.endDateOfTraining;
    
    let processed = record.requestProcessedDate;
    if (requestProcessedDate !== undefined) {
      if (requestProcessedDate === null || requestProcessedDate === '' || requestProcessedDate === '-') {
        processed = null;
      } else {
        processed = normalizeDateToUTC(requestProcessedDate);
      }
    }

    let payment = record.paymentDate;
    if (paymentDate !== undefined) {
      if (paymentDate === null || paymentDate === '' || paymentDate === '-') {
        payment = null;
      } else {
        payment = normalizeDateToUTC(paymentDate);
      }
    }

    if (end < start) {
      return sendError(res, 'End Date cannot be before Start Date', [
        { field: 'endDateOfTraining', message: 'End date cannot be before start date' }
      ], 400);
    }

    if (processed && processed < start) {
      return sendError(res, 'Request Processed Date cannot be before Start Date', [
        { field: 'requestProcessedDate', message: 'Request processed date cannot be before start date' }
      ], 400);
    }

    // Update fields
    if (trainingTopic !== undefined) record.trainingTopic = trainingTopic;
    if (trainingModuleNumber !== undefined) record.trainingModuleNumber = trainingModuleNumber;
    if (trainerName !== undefined) record.trainerName = trainerName;
    if (trainingInstituteName !== undefined) record.trainingInstituteName = trainingInstituteName;
    if (typeOfTraining !== undefined) record.typeOfTraining = typeOfTraining;
    if (trainingMode !== undefined) record.trainingMode = trainingMode;
    if (trainingDurationHours !== undefined) record.trainingDurationHours = trainingDurationHours;
    if (startDateOfTraining !== undefined) record.startDateOfTraining = start;
    if (endDateOfTraining !== undefined) record.endDateOfTraining = end;
    if (requestProcessedDate !== undefined) record.requestProcessedDate = processed;
    if (paymentDate !== undefined) record.paymentDate = payment;
    if (groupName !== undefined) record.groupName = groupName;
    if (trainingStatus !== undefined) record.trainingStatus = trainingStatus;
    if (trainingCostPerPerson !== undefined) record.trainingCostPerPerson = trainingCostPerPerson;
    if (remarks !== undefined) record.remarks = remarks;

    record.updatedBy = req.user._id;
    await record.save();

    await logAudit({
      userId: req.user._id,
      userEmail: req.user.email,
      action: AUDIT_ACTIONS.UPDATE,
      module: 'TrainingRecord',
      recordId: record._id,
      before,
      after: record.toObject(),
      ipAddress: req.ip
    });

    return sendSuccess(res, 'Training record updated successfully', record);
  } catch (error) {
    next(error);
  }
};

// @desc    Soft delete a training record
// @route   DELETE /api/v1/training/:id
// @access  Private (Admin + Super Admin)
const deleteTrainingRecord = async (req, res, next) => {
  try {
    const record = await TrainingRecord.findById(req.params.id);
    if (!record || record.isDeleted) {
      return sendError(res, 'Training record not found', [], 404);
    }

    const before = record.toObject();

    record.isDeleted = true;
    record.deletedBy = req.user._id;
    await record.save();

    await logAudit({
      userId: req.user._id,
      userEmail: req.user.email,
      action: AUDIT_ACTIONS.DELETE,
      module: 'TrainingRecord',
      recordId: record._id,
      before,
      after: record.toObject(),
      ipAddress: req.ip
    });

    return sendSuccess(res, 'Training record deleted successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Perform dry-run duplicate check prior to submit
// @route   GET /api/v1/training/check-duplicate
// @access  Private (Admin + Super Admin)
const checkDuplicate = async (req, res, next) => {
  try {
    const { staffNumber, trainingModuleNumber, startDateOfTraining, excludeId } = req.query;

    if (!staffNumber || !trainingModuleNumber || !startDateOfTraining) {
      return sendError(res, 'staffNumber, trainingModuleNumber, and startDateOfTraining are required parameters', [], 400);
    }

    const query = {
      staffNumber,
      trainingModuleNumber,
      startDateOfTraining: normalizeDateToUTC(startDateOfTraining),
      isDeleted: false
    };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const duplicate = await TrainingRecord.findOne(query);

    return sendSuccess(res, 'Duplicate check completed', {
      isDuplicate: !!duplicate
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk soft delete training records
// @route   POST /api/v1/training/bulk-delete
// @access  Private (Admin + Super Admin)
const deleteTrainingRecordsBulk = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return sendError(res, 'No training record IDs provided for deletion', [], 400);
    }

    const records = await TrainingRecord.find({ _id: { $in: ids }, isDeleted: false });
    if (records.length === 0) {
      return sendError(res, 'No matching active training records found for the provided IDs', [], 404);
    }

    const deletedIds = [];
    const auditLogs = [];

    for (const record of records) {
      const before = record.toObject();
      
      // Update record state in memory for the 'after' state in audit log
      record.isDeleted = true;
      record.deletedBy = req.user._id;

      deletedIds.push(record._id);
      auditLogs.push({
        userId: req.user._id,
        userEmail: req.user.email,
        action: AUDIT_ACTIONS.DELETE,
        module: 'TrainingRecord',
        recordId: record._id,
        before,
        after: record.toObject(),
        ipAddress: req.ip
      });
    }

    // Perform bulk database update and bulk audit log insertion
    await TrainingRecord.updateMany(
      { _id: { $in: deletedIds } },
      { $set: { isDeleted: true, deletedBy: req.user._id } }
    );

    await logAuditBulk(auditLogs);

    return sendSuccess(res, `${deletedIds.length} training records deleted successfully`, { deletedIds });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTrainingRecords,
  createTrainingRecord,
  getTrainingRecordById,
  updateTrainingRecord,
  deleteTrainingRecord,
  checkDuplicate,
  deleteTrainingRecordsBulk
};
