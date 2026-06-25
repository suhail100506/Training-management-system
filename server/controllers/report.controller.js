const TrainingRecord = require('../models/TrainingRecord');
const Staff = require('../models/Staff');
const { startOfFY, endOfFY } = require('../utils/dateHelpers');
const { sendSuccess, sendError } = require('../utils/response');
const excelExport = require('../services/excelExport.service');
const pdfExport = require('../services/pdfExport.service');
const csvExport = require('../services/csvExport.service');

// Utility to parse multi-select query params (handles both arrays and comma-separated lists)
const parseMultiSelect = (val) => {
  if (!val) return null;
  if (Array.isArray(val)) return val;
  return val.split(',').map(s => s.trim()).filter(Boolean);
};

// Build search match query with support for arrays and date-range metrics
const buildReportMatchQuery = (query) => {
  const match = { isDeleted: false };
  const operator = query.filterOperator === 'or' ? 'or' : 'and';

  if (operator === 'or') {
    const conditions = [];

    // 1. Handle standard multi-select enums / identifiers
    const groups = parseMultiSelect(query.group);
    if (groups && groups.length > 0) conditions.push({ groupName: { $in: groups } });

    const divisions = parseMultiSelect(query.division);
    if (divisions && divisions.length > 0) conditions.push({ productDivisionCategory: { $in: divisions } });

    const types = parseMultiSelect(query.type);
    if (types && types.length > 0) conditions.push({ typeOfTraining: { $in: types } });

    const modes = parseMultiSelect(query.mode);
    if (modes && modes.length > 0) conditions.push({ trainingMode: { $in: modes } });

    const statuses = parseMultiSelect(query.status);
    if (statuses && statuses.length > 0) conditions.push({ trainingStatus: { $in: statuses } });

    if (query.staffNumber) {
      conditions.push({ staffNumber: query.staffNumber });
    }

    // 2. Handle financial year, quarters, and months (Indian Fiscal System)
    let dateQuery = {};
    let dateQueryApplied = false;

    const fy = query.financialYear;
    if (fy && fy !== 'all') {
      const start = startOfFY(fy);
      const end = endOfFY(fy);
      if (start && end) {
        dateQuery.$gte = start;
        dateQuery.$lte = end;
        dateQueryApplied = true;
      }
    }

    if (query.startDate) {
      dateQuery.$gte = new Date(query.startDate);
      dateQueryApplied = true;
    }
    if (query.endDate) {
      dateQuery.$lte = new Date(query.endDate);
      dateQueryApplied = true;
    }

    // Quarters
    const quarters = parseMultiSelect(query.quarter);
    if (quarters && quarters.length > 0) {
      let startYear;
      if (fy) {
        const matchFY = fy.match(/FY (\d{4})-\d{2}/);
        if (matchFY) startYear = parseInt(matchFY[1], 10);
      }
      if (!startYear) {
        const now = new Date();
        startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      }

      const quarterRanges = quarters.map(q => {
        let qStart, qEnd;
        if (q === 'Q1') {
          qStart = new Date(Date.UTC(startYear, 3, 1));
          qEnd = new Date(Date.UTC(startYear, 5, 30, 23, 59, 59, 999));
        } else if (q === 'Q2') {
          qStart = new Date(Date.UTC(startYear, 6, 1));
          qEnd = new Date(Date.UTC(startYear, 8, 30, 23, 59, 59, 999));
        } else if (q === 'Q3') {
          qStart = new Date(Date.UTC(startYear, 9, 1));
          qEnd = new Date(Date.UTC(startYear, 11, 31, 23, 59, 59, 999));
        } else if (q === 'Q4') {
          qStart = new Date(Date.UTC(startYear + 1, 0, 1));
          qEnd = new Date(Date.UTC(startYear + 1, 2, 31, 23, 59, 59, 999));
        }
        return { startDateOfTraining: { $gte: qStart, $lte: qEnd } };
      });

      if (quarterRanges.length > 0) {
        conditions.push({ $or: quarterRanges });
      }
    }

    // Months
    const months = parseMultiSelect(query.month);
    if (months && months.length > 0) {
      let startYear;
      if (fy) {
        const matchFY = fy.match(/FY (\d{4})-\d{2}/);
        if (matchFY) startYear = parseInt(matchFY[1], 10);
      }
      if (!startYear) {
        startYear = new Date().getFullYear();
      }

      const monthRanges = months.map(m => {
        const monthIndex = parseInt(m, 10) - 1;
        const actualYear = monthIndex < 3 && fy ? startYear + 1 : startYear;
        const mStart = new Date(Date.UTC(actualYear, monthIndex, 1));
        const mEnd = new Date(Date.UTC(actualYear, monthIndex + 1, 0, 23, 59, 59, 999));
        return { startDateOfTraining: { $gte: mStart, $lte: mEnd } };
      });

      if (monthRanges.length > 0) {
        conditions.push({ $or: monthRanges });
      }
    }

    if (dateQueryApplied) {
      conditions.push({ startDateOfTraining: dateQuery });
    }

    if (conditions.length > 0) {
      match.$or = conditions;
    }

    return match;
  }

  // 1. Handle standard multi-select enums / identifiers
  const groups = parseMultiSelect(query.group);
  if (groups && groups.length > 0) match.groupName = { $in: groups };

  const divisions = parseMultiSelect(query.division);
  if (divisions && divisions.length > 0) match.productDivisionCategory = { $in: divisions };

  const types = parseMultiSelect(query.type);
  if (types && types.length > 0) match.typeOfTraining = { $in: types };

  const modes = parseMultiSelect(query.mode);
  if (modes && modes.length > 0) match.trainingMode = { $in: modes };

  const statuses = parseMultiSelect(query.status);
  if (statuses && statuses.length > 0) match.trainingStatus = { $in: statuses };

  if (query.staffNumber) {
    match.staffNumber = query.staffNumber;
  }

  // 2. Handle financial year, quarters, and months (Indian Fiscal System)
  let dateQuery = {};
  let dateQueryApplied = false;

  const fy = query.financialYear;
  if (fy && fy !== 'all') {
    const start = startOfFY(fy);
    const end = endOfFY(fy);
    if (start && end) {
      dateQuery.$gte = start;
      dateQuery.$lte = end;
      dateQueryApplied = true;
    }
  }

  if (query.startDate) {
    dateQuery.$gte = new Date(query.startDate);
    dateQueryApplied = true;
  }
  if (query.endDate) {
    dateQuery.$lte = new Date(query.endDate);
    dateQueryApplied = true;
  }

  // Quarters
  const quarters = parseMultiSelect(query.quarter);
  if (quarters && quarters.length > 0) {
    let startYear;
    if (fy) {
      const matchFY = fy.match(/FY (\d{4})-\d{2}/);
      if (matchFY) startYear = parseInt(matchFY[1], 10);
    }
    if (!startYear) {
      const now = new Date();
      startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    }

    const quarterRanges = quarters.map(q => {
      let qStart, qEnd;
      if (q === 'Q1') {
        qStart = new Date(Date.UTC(startYear, 3, 1));
        qEnd = new Date(Date.UTC(startYear, 5, 30, 23, 59, 59, 999));
      } else if (q === 'Q2') {
        qStart = new Date(Date.UTC(startYear, 6, 1));
        qEnd = new Date(Date.UTC(startYear, 8, 30, 23, 59, 59, 999));
      } else if (q === 'Q3') {
        qStart = new Date(Date.UTC(startYear, 9, 1));
        qEnd = new Date(Date.UTC(startYear, 11, 31, 23, 59, 59, 999));
      } else if (q === 'Q4') {
        qStart = new Date(Date.UTC(startYear + 1, 0, 1));
        qEnd = new Date(Date.UTC(startYear + 1, 2, 31, 23, 59, 59, 999));
      }
      return { startDateOfTraining: { $gte: qStart, $lte: qEnd } };
    });

    if (quarterRanges.length > 0) {
      // If we already have date query, intersect or wrap in $and
      if (match.$and) {
        match.$and.push({ $or: quarterRanges });
      } else {
        match.$and = [{ $or: quarterRanges }];
      }
    }
  }

  // Months
  const months = parseMultiSelect(query.month);
  if (months && months.length > 0) {
    let startYear;
    if (fy) {
      const matchFY = fy.match(/FY (\d{4})-\d{2}/);
      if (matchFY) startYear = parseInt(matchFY[1], 10);
    }
    if (!startYear) {
      startYear = new Date().getFullYear();
    }

    const monthRanges = months.map(m => {
      const monthIndex = parseInt(m, 10) - 1;
      // In Indian FY, months Jan-Mar belong to startYear + 1
      const actualYear = monthIndex < 3 && fy ? startYear + 1 : startYear;
      const mStart = new Date(Date.UTC(actualYear, monthIndex, 1));
      const mEnd = new Date(Date.UTC(actualYear, monthIndex + 1, 0, 23, 59, 59, 999));
      return { startDateOfTraining: { $gte: mStart, $lte: mEnd } };
    });

    if (monthRanges.length > 0) {
      if (match.$and) {
        match.$and.push({ $or: monthRanges });
      } else {
        match.$and = [{ $or: monthRanges }];
      }
    }
  }

  if (dateQueryApplied) {
    // Merge standard date range filter
    if (match.$and) {
      match.$and.push({ startDateOfTraining: dateQuery });
    } else {
      match.startDateOfTraining = dateQuery;
    }
  }

  return match;
};

// @desc    Get Monthwise report
// @route   GET /api/v1/reports/monthly
// @access  Private (Admin + Super Admin)
const getMonthlyReport = async (req, res, next) => {
  try {
    const match = buildReportMatchQuery(req.query);

    const data = await TrainingRecord.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $month: '$startDateOfTraining' },
          totalTrainings: { $sum: 1 },
          uniqueStaff: { $addToSet: '$staffNumber' },
          trainingHours: { $sum: '$trainingDurationHours' },
          totalCost: { $sum: '$trainingCostPerPerson' },
          otCount: { $sum: { $cond: [{ $eq: ['$typeOfTraining', 'OT'] }, 1, 0] } },
          extCount: { $sum: { $cond: [{ $eq: ['$typeOfTraining', 'Training for external members'] }, 1, 0] } },
          grpCount: { $sum: { $cond: [{ $eq: ['$typeOfTraining', 'Group specific'] }, 1, 0] } },
          othCount: { $sum: { $cond: [{ $eq: ['$typeOfTraining', 'Others'] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Compute active staff list to calculate coverage percentages
    const staffQuery = { isDeleted: false, employmentStatus: 'Currently Serving' };
    const groups = parseMultiSelect(req.query.group);
    if (groups && groups.length > 0) staffQuery.groupName = { $in: groups };
    const divisions = parseMultiSelect(req.query.division);
    if (divisions && divisions.length > 0) staffQuery.productDivisionCategory = { $in: divisions };
    
    const totalActiveStaff = await Staff.countDocuments(staffQuery) || 1;

    const result = data.map(item => {
      const mIndex = item._id - 1;
      const trainedCount = item.uniqueStaff.length;
      return {
        month: monthNames[mIndex],
        monthNumber: item._id,
        totalTrainings: item.totalTrainings,
        uniqueStaff: trainedCount,
        trainingHours: item.trainingHours,
        totalCost: item.totalCost,
        coveragePercent: Math.round((trainedCount / totalActiveStaff) * 1000) / 10,
        byType: {
          OT: item.otCount,
          External: item.extCount,
          Group: item.grpCount,
          Others: item.othCount
        }
      };
    });

    // Sort to fit Indian Fiscal Year (April -> March)
    result.sort((a, b) => {
      const orderA = a.monthNumber >= 4 ? a.monthNumber - 4 : a.monthNumber + 8;
      const orderB = b.monthNumber >= 4 ? b.monthNumber - 4 : b.monthNumber + 8;
      return orderA - orderB;
    });

    return sendSuccess(res, 'Monthly report fetched successfully', result);
  } catch (error) {
    next(error);
  }
};

// @desc    Get Quarterwise report
// @route   GET /api/v1/reports/quarterly
// @access  Private (Admin + Super Admin)
const getQuarterlyReport = async (req, res, next) => {
  try {
    const match = buildReportMatchQuery(req.query);

    const data = await TrainingRecord.aggregate([
      { $match: match },
      {
        $project: {
          month: { $month: '$startDateOfTraining' },
          trainingDurationHours: 1,
          trainingCostPerPerson: 1,
          staffNumber: 1
        }
      },
      {
        $project: {
          quarter: {
            $cond: [
              { $and: [{ $gte: ['$month', 4] }, { $lte: ['$month', 6] }] },
              'Q1',
              {
                $cond: [
                  { $and: [{ $gte: ['$month', 7] }, { $lte: ['$month', 9] }] },
                  'Q2',
                  {
                    $cond: [
                      { $and: [{ $gte: ['$month', 10] }, { $lte: ['$month', 12] }] },
                      'Q3',
                      'Q4'
                    ]
                  }
                ]
              }
            ]
          },
          trainingDurationHours: 1,
          trainingCostPerPerson: 1,
          staffNumber: 1
        }
      },
      {
        $group: {
          _id: '$quarter',
          totalTrainings: { $sum: 1 },
          uniqueStaff: { $addToSet: '$staffNumber' },
          trainingHours: { $sum: '$trainingDurationHours' },
          totalCost: { $sum: '$trainingCostPerPerson' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const staffQuery = { isDeleted: false, employmentStatus: 'Currently Serving' };
    const groups = parseMultiSelect(req.query.group);
    if (groups && groups.length > 0) staffQuery.groupName = { $in: groups };
    const divisions = parseMultiSelect(req.query.division);
    if (divisions && divisions.length > 0) staffQuery.productDivisionCategory = { $in: divisions };
    
    const totalActiveStaff = await Staff.countDocuments(staffQuery) || 1;

    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const result = quarters.map(q => {
      const matchQ = data.find(item => item._id === q) || {
        totalTrainings: 0,
        uniqueStaff: [],
        trainingHours: 0,
        totalCost: 0
      };
      const trainedCount = matchQ.uniqueStaff.length;

      return {
        quarter: q,
        totalTrainings: matchQ.totalTrainings,
        uniqueStaff: trainedCount,
        trainingHours: matchQ.trainingHours,
        totalCost: matchQ.totalCost,
        coveragePercent: Math.round((trainedCount / totalActiveStaff) * 1000) / 10
      };
    });

    return sendSuccess(res, 'Quarterly report fetched successfully', result);
  } catch (error) {
    next(error);
  }
};

// @desc    Get Financial Year report
// @route   GET /api/v1/reports/financial-year
// @access  Private (Admin + Super Admin)
const getFinancialYearReport = async (req, res, next) => {
  try {
    // Get all records matches
    const match = buildReportMatchQuery(req.query);

    const records = await TrainingRecord.find(match).select('startDateOfTraining trainingDurationHours trainingCostPerPerson staffNumber typeOfTraining').lean();

    // Group by FY programmatically
    const fyGroups = {};
    records.forEach(r => {
      const date = new Date(r.startDateOfTraining);
      const month = date.getMonth(); // Jan is 0, Apr is 3
      const year = date.getFullYear();
      const fyString = month >= 3 ? `FY ${year}-${String(year + 1).slice(-2)}` : `FY ${year - 1}-${String(year).slice(-2)}`;

      if (!fyGroups[fyString]) {
        fyGroups[fyString] = {
          fy: fyString,
          totalTrainings: 0,
          uniqueStaff: new Set(),
          trainingHours: 0,
          totalCost: 0,
          byType: { OT: 0, External: 0, Group: 0, Others: 0 }
        };
      }

      const g = fyGroups[fyString];
      g.totalTrainings += 1;
      g.uniqueStaff.add(r.staffNumber);
      g.trainingHours += r.trainingDurationHours;
      g.totalCost += r.trainingCostPerPerson;

      if (r.typeOfTraining === 'OT') g.byType.OT += 1;
      else if (r.typeOfTraining === 'Training for external members') g.byType.External += 1;
      else if (r.typeOfTraining === 'Group specific') g.byType.Group += 1;
      else g.byType.Others += 1;
    });

    const staffQuery = { isDeleted: false, employmentStatus: 'Currently Serving' };
    const groups = parseMultiSelect(req.query.group);
    if (groups && groups.length > 0) staffQuery.groupName = { $in: groups };
    const totalActiveStaff = await Staff.countDocuments(staffQuery) || 1;

    const result = Object.values(fyGroups).map(g => ({
      ...g,
      uniqueStaff: g.uniqueStaff.size,
      coveragePercent: Math.round((g.uniqueStaff.size / totalActiveStaff) * 1000) / 10
    })).sort((a, b) => b.fy.localeCompare(a.fy)); // sort newest first

    return sendSuccess(res, 'Financial Year report fetched successfully', result);
  } catch (error) {
    next(error);
  }
};

// @desc    Get Staff-wise report
// @route   GET /api/v1/reports/staff-wise
// @access  Private (Admin + Super Admin)
const getStaffWiseReport = async (req, res, next) => {
  try {
    const match = buildReportMatchQuery(req.query);

    const data = await TrainingRecord.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$staffNumber',
          staffName: { $first: '$staffName' },
          designation: { $first: '$designation' },
          groupName: { $first: '$groupName' },
          totalTrainings: { $sum: 1 },
          totalHours: { $sum: '$trainingDurationHours' },
          totalCost: { $sum: '$trainingCostPerPerson' },
          completedCount: { $sum: { $cond: [{ $eq: ['$trainingStatus', 'Completed'] }, 1, 0] } },
          notCompletedCount: { $sum: { $cond: [{ $eq: ['$trainingStatus', 'Not Completed'] }, 1, 0] } },
          cancelledCount: { $sum: { $cond: [{ $eq: ['$trainingStatus', 'Cancelled'] }, 1, 0] } }
        }
      },
      { $sort: { totalTrainings: -1 } }
    ]);

    const result = data.map(item => ({
      staffNumber: item._id,
      staffName: item.staffName || 'Unknown',
      designation: item.designation || 'N/A',
      groupName: item.groupName || 'N/A',
      totalTrainings: item.totalTrainings,
      totalHours: item.totalHours,
      totalCost: item.totalCost,
      statusBreakdown: {
        Completed: item.completedCount,
        NotCompleted: item.notCompletedCount,
        Cancelled: item.cancelledCount
      }
    }));

    return sendSuccess(res, 'Staff-wise report fetched successfully', result);
  } catch (error) {
    next(error);
  }
};

// @desc    Get Department/Group-wise report
// @route   GET /api/v1/reports/department-wise
// @access  Private (Admin + Super Admin)
const getDepartmentWiseReport = async (req, res, next) => {
  try {
    const match = buildReportMatchQuery(req.query);

    // 1. Unique staff trained per group
    const trainedData = await TrainingRecord.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$groupName',
          trainedStaff: { $addToSet: '$staffNumber' },
          totalHours: { $sum: '$trainingDurationHours' },
          totalCost: { $sum: '$trainingCostPerPerson' },
          otCount: { $sum: { $cond: [{ $eq: ['$typeOfTraining', 'OT'] }, 1, 0] } },
          extCount: { $sum: { $cond: [{ $eq: ['$typeOfTraining', 'Training for external members'] }, 1, 0] } },
          grpCount: { $sum: { $cond: [{ $eq: ['$typeOfTraining', 'Group specific'] }, 1, 0] } },
          othCount: { $sum: { $cond: [{ $eq: ['$typeOfTraining', 'Others'] }, 1, 0] } }
        }
      }
    ]);

    // 2. Active staff per group
    const staffData = await Staff.aggregate([
      { $match: { isDeleted: false, employmentStatus: 'Currently Serving' } },
      {
        $group: {
          _id: '$groupName',
          totalStaff: { $sum: 1 }
        }
      }
    ]);

    const result = staffData.map(groupInfo => {
      const gName = groupInfo._id || 'Unknown';
      const trainedGroup = trainedData.find(item => item._id === groupInfo._id) || {
        trainedStaff: [],
        totalHours: 0,
        totalCost: 0,
        otCount: 0,
        extCount: 0,
        grpCount: 0,
        othCount: 0
      };

      const trainedCount = trainedGroup.trainedStaff.length;
      const totalCount = groupInfo.totalStaff;

      return {
        groupName: gName,
        totalStaff: totalCount,
        staffTrained: trainedCount,
        coveragePercent: totalCount > 0 ? Math.round((trainedCount / totalCount) * 100) : 0,
        totalHours: trainedGroup.totalHours,
        totalCost: trainedGroup.totalCost,
        byType: {
          OT: trainedGroup.otCount,
          External: trainedGroup.extCount,
          Group: trainedGroup.grpCount,
          Others: trainedGroup.othCount
        }
      };
    });

    return sendSuccess(res, 'Group-wise report fetched successfully', result);
  } catch (error) {
    next(error);
  }
};

// @desc    Get Cost analysis report
// @route   GET /api/v1/reports/cost-analysis
// @access  Private (Admin + Super Admin)
const getCostAnalysisReport = async (req, res, next) => {
  try {
    const match = buildReportMatchQuery(req.query);

    const data = await TrainingRecord.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$typeOfTraining',
          totalTrainings: { $sum: 1 },
          beneficiaries: {
            $sum: { $cond: [{ $eq: ['$trainingStatus', 'Completed'] }, 1, 0] }
          },
          totalCost: { $sum: '$trainingCostPerPerson' }
        }
      }
    ]);

    const result = data.map(item => ({
      trainingType: item._id,
      totalTrainings: item.totalTrainings,
      beneficiaries: item.beneficiaries,
      totalCost: item.totalCost,
      avgCostPerPerson: item.beneficiaries > 0 ? Math.round(item.totalCost / item.beneficiaries) : 0
    }));

    return sendSuccess(res, 'Cost analysis report fetched successfully', result);
  } catch (error) {
    next(error);
  }
};

// @desc    Get Training Status report
// @route   GET /api/v1/reports/training-status
// @access  Private (Admin + Super Admin)
const getTrainingStatusReport = async (req, res, next) => {
  try {
    const match = buildReportMatchQuery(req.query);

    const totalRecords = await TrainingRecord.countDocuments(match) || 1;

    const data = await TrainingRecord.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$trainingStatus',
          count: { $sum: 1 },
          hours: { $sum: '$trainingDurationHours' },
          cost: { $sum: '$trainingCostPerPerson' }
        }
      }
    ]);

    const statuses = ['Completed', 'Not Completed', 'Cancelled'];
    const result = statuses.map(s => {
      const matchS = data.find(item => item._id === s) || {
        count: 0,
        hours: 0,
        cost: 0
      };

      return {
        status: s,
        count: matchS.count,
        percentOfTotal: Math.round((matchS.count / totalRecords) * 1000) / 10,
        trainingHours: matchS.hours,
        cost: matchS.cost
      };
    });

    return sendSuccess(res, 'Status report fetched successfully', result);
  } catch (error) {
    next(error);
  }
};

// @desc    Get Beneficiaries per training report
// @route   GET /api/v1/reports/beneficiaries
// @access  Private (Admin + Super Admin)
const getBeneficiaryReport = async (req, res, next) => {
  try {
    const match = buildReportMatchQuery(req.query);

    const data = await TrainingRecord.aggregate([
      { $match: match },
      {
        $group: {
          _id: { module: '$trainingModuleNumber', topic: '$trainingTopic' },
          type: { $first: '$typeOfTraining' },
          beneficiaryCount: {
            $sum: { $cond: [{ $eq: ['$trainingStatus', 'Completed'] }, 1, 0] }
          },
          totalHours: { $sum: '$trainingDurationHours' },
          totalCost: { $sum: '$trainingCostPerPerson' },
          status: { $first: '$trainingStatus' }
        }
      },
      { $sort: { beneficiaryCount: -1 } }
    ]);

    const result = data.map(item => ({
      trainingTopic: item._id.topic,
      moduleNumber: item._id.module,
      type: item.type,
      beneficiaryCount: item.beneficiaryCount,
      totalHours: item.totalHours,
      totalCost: item.totalCost,
      status: item.status
    }));

    return sendSuccess(res, 'Beneficiary report fetched successfully', result);
  } catch (error) {
    next(error);
  }
};

// @desc    Export any report to Excel/PDF/CSV
// @route   POST /api/v1/reports/export
// @access  Private (Admin + Super Admin)
const exportReport = async (req, res, next) => {
  try {
    const { reportType, format, filters } = req.body;

    if (!reportType || !format) {
      return sendError(res, 'reportType and format are required', [], 400);
    }

    // Apply the filters to query matching
    const match = buildReportMatchQuery(filters || {});

    // Fetch records to generate the report data
    let reportData = [];
    const staffQuery = { isDeleted: false, employmentStatus: 'Currently Serving' };
    const totalActiveStaff = await Staff.countDocuments(staffQuery) || 1;

    // Build matching data programmatically depending on reportType
    if (reportType === 'all' && (filters?.coverageOnly === 'true' || filters?.coverageOnly === true)) {
      const raw = await TrainingRecord.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$groupName',
            trainedStaff: { $addToSet: '$staffNumber' },
            totalHours: { $sum: '$trainingDurationHours' }
          }
        }
      ]);
      const staffs = await Staff.aggregate([
        { $match: { isDeleted: false, employmentStatus: 'Currently Serving' } },
        { $group: { _id: '$groupName', count: { $sum: 1 } } }
      ]);
      
      // Sort groups alphabetically
      staffs.sort((a, b) => {
        const nameA = (a._id || 'Unknown').toUpperCase();
        const nameB = (b._id || 'Unknown').toUpperCase();
        return nameA.localeCompare(nameB);
      });

      let serialNumber = 1;
      reportData = staffs.map(item => {
        const trg = raw.find(r => r._id === item._id) || { trainedStaff: [], totalHours: 0 };
        const coverageVal = item.count > 0 ? (trg.trainedStaff.length / item.count) * 100 : 0;
        return {
          'S.NO': serialNumber++,
          'Group Name': item._id || 'Unknown',
          'No of Trainees': trg.trainedStaff.length,
          'GROUP STRENGTH': item.count,
          '% COVERAGE FOR THE GROUP': parseFloat(coverageVal.toFixed(2)),
          'Time Spend on Group': trg.totalHours || 0
        };
      });
    } else if (reportType === 'monthly') {
      const raw = await TrainingRecord.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $month: '$startDateOfTraining' },
            totalTrainings: { $sum: 1 },
            uniqueStaff: { $addToSet: '$staffNumber' },
            trainingHours: { $sum: '$trainingDurationHours' },
            totalCost: { $sum: '$trainingCostPerPerson' }
          }
        }
      ]);
      const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      reportData = raw.map(item => ({
        Month: months[item._id - 1],
        'Total Trainings': item.totalTrainings,
        'Unique Staff Trained': item.uniqueStaff.length,
        'Total Training Hours': item.trainingHours,
        'Total Cost (₹)': item.totalCost,
        'Coverage Percent': Math.round((item.uniqueStaff.length / totalActiveStaff) * 100) + '%'
      }));
    } else if (reportType === 'quarterly') {
      const raw = await TrainingRecord.aggregate([
        { $match: match },
        {
          $project: {
            month: { $month: '$startDateOfTraining' },
            trainingDurationHours: 1,
            trainingCostPerPerson: 1,
            staffNumber: 1
          }
        },
        {
          $project: {
            quarter: {
              $cond: [
                { $and: [{ $gte: ['$month', 4] }, { $lte: ['$month', 6] }] },
                'Q1',
                {
                  $cond: [
                    { $and: [{ $gte: ['$month', 7] }, { $lte: ['$month', 9] }] },
                    'Q2',
                    {
                      $cond: [
                        { $and: [{ $gte: ['$month', 10] }, { $lte: ['$month', 12] }] },
                        'Q3',
                        'Q4'
                      ]
                    }
                  ]
                }
              ]
            },
            trainingDurationHours: 1,
            trainingCostPerPerson: 1,
            staffNumber: 1
          }
        },
        {
          $group: {
            _id: '$quarter',
            totalTrainings: { $sum: 1 },
            uniqueStaff: { $addToSet: '$staffNumber' },
            trainingHours: { $sum: '$trainingDurationHours' },
            totalCost: { $sum: '$trainingCostPerPerson' }
          }
        }
      ]);
      reportData = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
        const item = raw.find(r => r._id === q) || { totalTrainings: 0, uniqueStaff: [], trainingHours: 0, totalCost: 0 };
        return {
          Quarter: q,
          'Total Trainings': item.totalTrainings,
          'Unique Staff Trained': item.uniqueStaff.length,
          'Total Training Hours': item.trainingHours,
          'Total Cost (₹)': item.totalCost,
          'Coverage Percent': Math.round((item.uniqueStaff.length / totalActiveStaff) * 100) + '%'
        };
      });
    } else if (reportType === 'staff-wise') {
      const raw = await TrainingRecord.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$staffNumber',
            staffName: { $first: '$staffName' },
            designation: { $first: '$designation' },
            groupName: { $first: '$groupName' },
            totalTrainings: { $sum: 1 },
            totalHours: { $sum: '$trainingDurationHours' },
            totalCost: { $sum: '$trainingCostPerPerson' }
          }
        }
      ]);
      reportData = raw.map(item => ({
        'Staff Number': item._id,
        'Staff Name': item.staffName || '',
        Designation: item.designation || '',
        'Group Name': item.groupName || '',
        'Total Trainings': item.totalTrainings,
        'Total Hours': item.totalHours,
        'Total Cost (₹)': item.totalCost
      }));
    } else if (reportType === 'department-wise') {
      const raw = await TrainingRecord.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$groupName',
            trainedStaff: { $addToSet: '$staffNumber' },
            totalHours: { $sum: '$trainingDurationHours' },
            totalCost: { $sum: '$trainingCostPerPerson' }
          }
        }
      ]);
      const staffs = await Staff.aggregate([
        { $match: { isDeleted: false, employmentStatus: 'Currently Serving' } },
        { $group: { _id: '$groupName', count: { $sum: 1 } } }
      ]);
      reportData = staffs.map(item => {
        const trg = raw.find(r => r._id === item._id) || { trainedStaff: [], totalHours: 0, totalCost: 0 };
        return {
          'Group Name': item._id || 'Unknown',
          'Total Staff': item.count,
          'Staff Trained': trg.trainedStaff.length,
          'Coverage Percent': Math.round((trg.trainedStaff.length / item.count) * 100) + '%',
          'Total Hours': trg.totalHours,
          'Total Cost (₹)': trg.totalCost
        };
      });
    } else if (reportType === 'cost-analysis') {
      const raw = await TrainingRecord.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$typeOfTraining',
            totalTrainings: { $sum: 1 },
            beneficiaries: { $sum: { $cond: [{ $eq: ['$trainingStatus', 'Completed'] }, 1, 0] } },
            totalCost: { $sum: '$trainingCostPerPerson' }
          }
        }
      ]);
      reportData = raw.map(item => ({
        'Training Type': item._id,
        'Total Trainings': item.totalTrainings,
        Beneficiaries: item.beneficiaries,
        'Total Cost (₹)': item.totalCost,
        'Average Cost Per Person (₹)': item.beneficiaries > 0 ? Math.round(item.totalCost / item.beneficiaries) : 0
      }));
    } else if (reportType === 'training-status') {
      const raw = await TrainingRecord.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$trainingStatus',
            count: { $sum: 1 },
            hours: { $sum: '$trainingDurationHours' },
            cost: { $sum: '$trainingCostPerPerson' }
          }
        }
      ]);
      reportData = raw.map(item => ({
        Status: item._id,
        Count: item.count,
        'Training Hours': item.hours,
        'Cost (₹)': item.cost
      }));
    } else if (reportType === 'beneficiaries') {
      const raw = await TrainingRecord.aggregate([
        { $match: match },
        {
          $group: {
            _id: { module: '$trainingModuleNumber', topic: '$trainingTopic' },
            type: { $first: '$typeOfTraining' },
            beneficiaryCount: { $sum: { $cond: [{ $eq: ['$trainingStatus', 'Completed'] }, 1, 0] } },
            totalHours: { $sum: '$trainingDurationHours' },
            totalCost: { $sum: '$trainingCostPerPerson' }
          }
        }
      ]);
      reportData = raw.map(item => ({
        'Training Topic': item._id.topic,
        'Module Number': item._id.module,
        Type: item.type,
        'Beneficiary Count': item.beneficiaryCount,
        'Total Hours': item.totalHours,
        'Total Cost (₹)': item.totalCost
      }));
    } else {
      // Default: Raw Training Records listing matching filters
      const raw = await TrainingRecord.find(match).sort({ startDateOfTraining: -1 }).lean();
      reportData = raw.map(r => ({
        'Staff Number': r.staffNumber,
        'Staff Name': r.staffName || '',
        'Group Name': r.groupName || '',
        'Training Topic': r.trainingTopic,
        'Trainer Name': r.trainerName || '',
        'Module Number': r.trainingModuleNumber,
        'Training Type': r.typeOfTraining,
        Mode: r.trainingMode,
        'Time Spend by Staff': r.trainingDurationHours,
        'Start Date': new Date(r.startDateOfTraining).toISOString().split('T')[0],
        'End Date': new Date(r.endDateOfTraining).toISOString().split('T')[0],
        'Request Processed Date': r.requestProcessedDate ? new Date(r.requestProcessedDate).toISOString().split('T')[0] : '-',
        'Payment Date': r.paymentDate ? new Date(r.paymentDate).toISOString().split('T')[0] : '-',
        Status: r.trainingStatus,
        'Cost (₹)': r.trainingCostPerPerson,
        Remarks: r.remarks || ''
      }));
    }

    // Resolve dynamic export title
    let exportTitle = reportType;
    const fySuffix = filters?.financialYear ? ` _${filters.financialYear.replace(/\s+/g, '_')}` : '';
    if (reportType === 'all') {
      if (filters?.coverageOnly === 'true' || filters?.coverageOnly === true) {
        exportTitle = `Groupwise Training Details${fySuffix}`;
      } else {
        exportTitle = `All Training Records${fySuffix}`;
      }
    } else {
      const prettyReportNames = {
        'monthly': 'Monthly Report',
        'quarterly': 'Quarterly Report',
        'financial-year': 'Financial Year Report',
        'staff-wise': 'Staff-Wise Report',
        'department-wise': 'Group-Wise Report',
        'cost-analysis': 'Cost Analysis Report',
        'training-status': 'Training Status Report',
        'beneficiaries': 'Beneficiary Report'
      };
      const name = prettyReportNames[reportType] || reportType;
      exportTitle = `${name}${fySuffix}`;
    }

    // Export formats
    if (format === 'excel') {
      const buffer = await excelExport.generateExcel(exportTitle, reportData, filters);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=KMG_TMS_${reportType}_export.xlsx`);
      return res.send(buffer);
    } else if (format === 'csv') {
      const csvStr = csvExport.generateCSV(reportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=KMG_TMS_${reportType}_export.csv`);
      return res.send(csvStr);
    } else if (format === 'pdf') {
      // Return stream / buffer
      const docDefinition = pdfExport.generatePDFDefinition(exportTitle, reportData, filters);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=KMG_TMS_${reportType}_export.pdf`);
      // We will pipeline the pdf doc creation to the response
      return pdfExport.sendPDF(res, docDefinition);
    } else {
      return sendError(res, `Unsupported export format: ${format}`, [], 400);
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMonthlyReport,
  getQuarterlyReport,
  getFinancialYearReport,
  getStaffWiseReport,
  getDepartmentWiseReport,
  getCostAnalysisReport,
  getTrainingStatusReport,
  getBeneficiaryReport,
  exportReport
};
