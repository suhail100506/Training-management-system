const xlsx = require('xlsx');
const moment = require('moment');
const Staff = require('../models/Staff');
const TrainingRecord = require('../models/TrainingRecord');
const UploadBatch = require('../models/UploadBatch');
const User = require('../models/User');
const { logAudit } = require('../middleware/auditLogger');
const { TRAINING_TYPES, TRAINING_MODES, TRAINING_STATUSES, AUDIT_ACTIONS } = require('../config/constants');

// Normalize Date to UTC midnight
const normalizeDateToUTC = (dateVal) => {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
};

// Parse date formats from string/number values
const parseDateValue = (val) => {
  if (!val) return null;
  
  let d;
  if (val instanceof Date) {
    d = val;
  } else if (typeof val === 'number') {
    // Excel Serial Date (numbers representing days since 1900-01-01)
    d = new Date(Math.round((val - 25569) * 86400 * 1000));
  } else {
    const cleanStr = String(val).trim();
    
    // Format DD/MM/YYYY
    const m1 = moment.utc(cleanStr, 'DD/MM/YYYY', true);
    if (m1.isValid()) return m1.toDate();

    // Format YYYY-MM-DD
    const m2 = moment.utc(cleanStr, 'YYYY-MM-DD', true);
    if (m2.isValid()) return m2.toDate();

    // Fallback generic parsing
    const m3 = moment.utc(cleanStr);
    if (m3.isValid()) return m3.toDate();

    return null;
  }

  return normalizeDateToUTC(d);
};

/**
 * Validates and inserts spreadsheet rows chunk by chunk.
 */
const processBulkUpload = async (filePath, batchId, userId) => {
  const batch = await UploadBatch.findOne({ batchId });
  if (!batch) return;

  try {
    const workbook = xlsx.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert sheet to raw 2D array of values
    const rawRows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    // Define column name aliases (flexible matching for exports & custom formats)
    const headerMapping = {
      staffNumber: ['staff number', 'staff no', 'staff number', 'staffid', 'staff id'],
      trainingTopic: ['training topic', 'topic', 'trainingtopic'],
      trainingModuleNumber: ['training module number', 'module number', 'module no', 'modulenumber', 'module no.'],
      trainerName: ['trainer name', 'trainer', 'trainername'],
      trainingInstituteName: ['training institute name', 'training institute', 'institute name', 'traininginstitutename'],
      typeOfTraining: ['type of training', 'training type', 'type', 'typeoftraining'],
      trainingMode: ['training mode', 'mode', 'trainingmode'],
      trainingDurationHours: ['training duration hours', 'duration (hrs)', 'duration', 'training duration', 'trainingdurationhours'],
      startDate: ['start date', 'start date of training', 'startdate', 'startdateoftraining'],
      endDate: ['end date', 'end date of training', 'enddate', 'enddateoftraining'],
      requestProcessedDate: ['request processed date', 'request process date', 'processed date', 'requestprocesseddate'],
      paymentDate: ['payment date', 'paymentdate', 'date of payment', 'dateofpayment'],
      trainingStatus: ['training status', 'status', 'trainingstatus'],
      trainingCostPerPerson: ['training cost per person', 'training cost', 'cost (inr)', 'cost (₹)', 'cost', 'trainingcostperperson'],
      remarks: ['remarks', 'remark', 'comments', 'comment', 'notes', 'note'],
      staffName: ['staff name', 'name', 'employee name', 'staffname'],
      emailId: ['email id', 'email', 'email address', 'emailid'],
      designation: ['designation', 'role/designation', 'job title'],
      groupName: ['group name', 'group', 'department/group', 'groupname'],
      productDivisionCategory: ['product division/category', 'product division', 'division', 'category', 'productdivisioncategory', 'product division category'],
      reportingGLManagerName: ['reporting gl/manager name', 'reporting manager', 'manager name', 'reporting gl', 'reportingglmanagername', 'reporting manager (gl)'],
      employmentStatus: ['employment status', 'status of employment', 'employmentstatus'],
      dateOfJoining: ['date of joining', 'joining date', 'dateofjoining'],
      superannuationDate: ['superannuation date', 'superannuationdate']
    };

    let headerRowIndex = -1;
    let columnIndices = {};

    // 1. Identify which row is the header row
    for (let r = 0; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!Array.isArray(row)) continue;

      let matchedCount = 0;
      let tempIndices = {};

      row.forEach((cellVal, colIdx) => {
        const cleanVal = String(cellVal || '').trim().toLowerCase();
        if (cleanVal) {
          for (const [key, aliases] of Object.entries(headerMapping)) {
            if (aliases.includes(cleanVal)) {
              tempIndices[key] = colIdx;
              matchedCount++;
              break;
            }
          }
        }
      });

      // If we find 'staffNumber' and at least 3 other columns, it's our header row
      if (tempIndices.staffNumber !== undefined && matchedCount >= 4) {
        headerRowIndex = r;
        columnIndices = tempIndices;
        break;
      }
    }

    // Fallback: search for a row that simply contains 'Staff Number' case-insensitively
    if (headerRowIndex === -1) {
      for (let r = 0; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!Array.isArray(row)) continue;
        const hasStaffNo = row.some(cellVal => {
          const s = String(cellVal || '').trim().toLowerCase();
          return s === 'staff number' || s === 'staff no' || s === 'staff id';
        });
        if (hasStaffNo) {
          headerRowIndex = r;
          row.forEach((cellVal, colIdx) => {
            const cleanVal = String(cellVal || '').trim().toLowerCase();
            for (const [key, aliases] of Object.entries(headerMapping)) {
              if (aliases.includes(cleanVal)) {
                columnIndices[key] = colIdx;
                break;
              }
            }
          });
          break;
        }
      }
    }

    // Default Fallback: Assume row 0 is header row
    if (headerRowIndex === -1) {
      headerRowIndex = 0;
      const firstRow = rawRows[0] || [];
      firstRow.forEach((cellVal, colIdx) => {
        const cleanVal = String(cellVal || '').trim().toLowerCase();
        for (const [key, aliases] of Object.entries(headerMapping)) {
          if (aliases.includes(cleanVal)) {
            columnIndices[key] = colIdx;
            break;
          }
        }
      });
    }

    // Calculate total rows count excluding the header and empty rows
    const dataRows = rawRows.slice(headerRowIndex + 1).filter(row => row && row.length > 0 && !row.every(val => val === ''));
    batch.totalRows = dataRows.length;
    await batch.save();

    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    
    const errors = [];
    const duplicates = [];

    // Pre-cache all staff list (including soft-deleted) to prevent unique key violations
    const staffList = await Staff.find({}).lean();
    const staffMap = new Map();
    staffList.forEach(s => {
      staffMap.set(s.staffNumber.toUpperCase(), s);
    });

    // Pre-cache active types of training from Master Data
    const MasterData = require('../models/MasterData');
    const masterTypes = await MasterData.find({ type: 'typeOfTraining', isActive: true }).lean();
    const activeTypes = new Set([
      ...masterTypes.map(t => t.value.trim().toLowerCase()),
      ...Object.values(TRAINING_TYPES).map(t => t.trim().toLowerCase())
    ]);

    // Process rows sequentially
    for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0 || row.every(val => val === '')) continue;

      const rowNum = r + 1; // 1-indexed row number in the Excel file

      const getVal = (key) => {
        const idx = columnIndices[key];
        if (idx === undefined) return '';
        return row[idx] !== undefined ? row[idx] : '';
      };

      const staffNumber = String(getVal('staffNumber')).trim();
      const trainingTopic = String(getVal('trainingTopic')).trim() || '-';
      const trainingModuleNumber = String(getVal('trainingModuleNumber')).trim();
      const trainerName = String(getVal('trainerName')).trim() || '-';
      const trainingInstituteName = String(getVal('trainingInstituteName')).trim() || '-';
      const typeOfTraining = String(getVal('typeOfTraining')).trim() || '-';
      const trainingMode = String(getVal('trainingMode')).trim() || '-';
      const rawDuration = getVal('trainingDurationHours');
      const trainingDurationHours = rawDuration !== undefined && rawDuration !== '' ? (parseFloat(rawDuration) || 0) : 0;
      const startDateVal = getVal('startDate');
      const endDateVal = getVal('endDate');
      const requestProcessedDateVal = getVal('requestProcessedDate');
      const paymentDateVal = getVal('paymentDate');
      const trainingStatus = String(getVal('trainingStatus')).trim() || '-';
      const trainingCostPerPerson = parseFloat(getVal('trainingCostPerPerson')) || 0;
      const remarks = String(getVal('remarks')).trim() || '';

      // Extract optional staff fields from spreadsheet if available
      const staffName = String(getVal('staffName')).trim() || `Staff ${staffNumber}`;
      const emailId = String(getVal('emailId')).trim() || `${staffNumber.toLowerCase()}@kmg.com`;
      const designation = String(getVal('designation')).trim() || '-';
      const groupName = String(getVal('groupName')).trim() || '-';
      const productDivisionCategory = String(getVal('productDivisionCategory')).trim() || '-';
      const reportingGLManagerName = String(getVal('reportingGLManagerName')).trim() || '-';
      const employmentStatusVal = String(getVal('employmentStatus')).trim() || 'Currently Serving';
      const dateOfJoiningVal = getVal('dateOfJoining');
      const superannuationDateVal = getVal('superannuationDate');

      const dateOfJoining = parseDateValue(dateOfJoiningVal) || null;
      const superannuationDate = parseDateValue(superannuationDateVal) || null;

      // Construct representative row object for output logs
      const rowData = {
        'Staff Number': staffNumber,
        'Training Topic': trainingTopic,
        'Training Module Number': trainingModuleNumber,
        'Trainer Name': trainerName,
        'Training Institute Name': trainingInstituteName,
        'Type of Training': typeOfTraining,
        'Training Mode': trainingMode,
        'Training Duration Hours': trainingDurationHours,
        'Start Date': startDateVal,
        'End Date': endDateVal,
        'Request Processed Date': requestProcessedDateVal,
        'Payment Date': paymentDateVal,
        'Training Status': trainingStatus,
        'Training Cost Per Person': trainingCostPerPerson,
        'Remarks': remarks
      };

      // 1. Check required fields (Mandatory fields are Staff Number and Module Number)
      if (!staffNumber || !trainingModuleNumber) {
        errorCount++;
        errors.push({
          row: rowNum,
          reason: 'Missing required fields (Staff Number and Training Module Number are mandatory)',
          data: rowData
        });
        continue;
      }

      // 2. Validate enums
      const validModes = Object.values(TRAINING_MODES);
      const validStatuses = Object.values(TRAINING_STATUSES);

      if (!activeTypes.has(typeOfTraining.toLowerCase())) {
        errorCount++;
        errors.push({
          row: rowNum,
          reason: `Invalid Type of Training. Must be one of registered master types.`,
          data: rowData
        });
        continue;
      }

      if (!validModes.includes(trainingMode)) {
        errorCount++;
        errors.push({
          row: rowNum,
          reason: `Invalid Training Mode. Must be one of: ${validModes.join(', ')}`,
          data: rowData
        });
        continue;
      }

      if (!validStatuses.includes(trainingStatus)) {
        errorCount++;
        errors.push({
          row: rowNum,
          reason: `Invalid Training Status. Must be one of: ${validStatuses.join(', ')}`,
          data: rowData
        });
        continue;
      }

      // 3. Validate numeric duration
      const duration = parseFloat(trainingDurationHours);
      if (isNaN(duration) || duration < 0) {
        errorCount++;
        errors.push({
          row: rowNum,
          reason: 'Training Duration must be a positive number or zero',
          data: rowData
        });
        continue;
      }

      // 4. Validate Module Number alphanumeric formatting
      const moduleRegex = /^[a-zA-Z0-9-_]+$/;
      if (!moduleRegex.test(trainingModuleNumber)) {
        errorCount++;
        errors.push({
          row: rowNum,
          reason: 'Training Module Number must be alphanumeric (dashes and underscores allowed)',
          data: rowData
        });
        continue;
      }

      // 5. Parse date fields (defaulting if blank/missing)
      let startDate = null;
      if (startDateVal === undefined || startDateVal === '') {
        startDate = normalizeDateToUTC(new Date());
      } else {
        startDate = parseDateValue(startDateVal);
      }

      let endDate = null;
      if (endDateVal === undefined || endDateVal === '') {
        endDate = startDate || normalizeDateToUTC(new Date());
      } else {
        endDate = parseDateValue(endDateVal);
      }

      let requestProcessedDate = null;
      let isProcessedDateHyphen = false;
      const cleanProcessedDateVal = String(requestProcessedDateVal || '').trim();

      if (cleanProcessedDateVal === '-') {
        isProcessedDateHyphen = true;
        requestProcessedDate = null;
      } else if (requestProcessedDateVal === undefined || requestProcessedDateVal === '') {
        requestProcessedDate = startDate || normalizeDateToUTC(new Date());
      } else {
        requestProcessedDate = parseDateValue(requestProcessedDateVal);
      }

      let paymentDate = null;
      const cleanPaymentDateVal = String(paymentDateVal || '').trim();
      if (cleanPaymentDateVal && cleanPaymentDateVal !== '-') {
        paymentDate = parseDateValue(paymentDateVal);
      }

      if (!startDate || !endDate || (!requestProcessedDate && !isProcessedDateHyphen)) {
        errorCount++;
        errors.push({
          row: rowNum,
          reason: 'Invalid date formats. Standard formats allowed are DD/MM/YYYY or YYYY-MM-DD.',
          data: rowData
        });
        continue;
      }

      // Logical order validation
      if (endDate < startDate) {
        errorCount++;
        errors.push({
          row: rowNum,
          reason: 'End Date cannot be prior to Start Date',
          data: rowData
        });
        continue;
      }

      if (requestProcessedDate && requestProcessedDate < startDate) {
        errorCount++;
        errors.push({
          row: rowNum,
          reason: 'Request Processed Date cannot be prior to Start Date of Training',
          data: rowData
        });
        continue;
      }

      // 7. Verify Staff exists in Staff Master List (or auto-create/update if missing details)
      let staff = staffMap.get(staffNumber.toUpperCase());
      if (!staff) {
        try {
          const newStaff = new Staff({
            staffNumber: staffNumber,
            staffName: staffName,
            emailId: emailId,
            employmentStatus: employmentStatusVal,
            designation: designation,
            groupName: groupName,
            productDivisionCategory: productDivisionCategory,
            reportingGLManagerName: reportingGLManagerName,
            dateOfJoining: dateOfJoining,
            superannuationDate: superannuationDate,
            createdBy: userId
          });
          await newStaff.save();
          const { syncStaffMasterFields } = require('../utils/masterSync');
          await syncStaffMasterFields(newStaff);
          staff = newStaff.toObject();
          staffMap.set(staffNumber.toUpperCase(), staff);
        } catch (err) {
          errorCount++;
          errors.push({
            row: rowNum,
            reason: `Failed to register Staff Number "${staffNumber}": ${err.message}`,
            data: rowData
          });
          continue;
        }
      } else {
        // If staff exists but details are placeholders (e.g. "Staff S10002" or "-"), update them with sheet values
        let needsUpdate = false;
        
        if (emailId && emailId.toLowerCase() !== (staff.emailId || '').toLowerCase()) {
          staff.emailId = emailId.toLowerCase();
          needsUpdate = true;
        }
        if ((staff.staffName.startsWith('Staff ') || staff.staffName === staffNumber) && staffName !== staff.staffName && !staffName.startsWith('Staff ')) {
          staff.staffName = staffName;
          needsUpdate = true;
        }
        if ((staff.groupName === '-' || !staff.groupName) && groupName !== '-') {
          staff.groupName = groupName;
          needsUpdate = true;
        }
        if ((staff.designation === '-' || !staff.designation) && designation !== '-') {
          staff.designation = designation;
          needsUpdate = true;
        }
        if ((staff.productDivisionCategory === '-' || !staff.productDivisionCategory) && productDivisionCategory !== '-') {
          staff.productDivisionCategory = productDivisionCategory;
          needsUpdate = true;
        }
        if ((staff.reportingGLManagerName === '-' || !staff.reportingGLManagerName) && reportingGLManagerName !== '-') {
          staff.reportingGLManagerName = reportingGLManagerName;
          needsUpdate = true;
        }

        if (needsUpdate) {
          await Staff.updateOne({ _id: staff._id }, {
            emailId: staff.emailId,
            staffName: staff.staffName,
            groupName: staff.groupName,
            designation: staff.designation,
            productDivisionCategory: staff.productDivisionCategory,
            reportingGLManagerName: staff.reportingGLManagerName
          });
          const { syncStaffMasterFields } = require('../utils/masterSync');
          await syncStaffMasterFields(staff);
          staffMap.set(staffNumber.toUpperCase(), staff);
        }
      }

      // 8. Check for duplication via compound unique: staffNumber + trainingModuleNumber + startDateOfTraining
      const duplicateExists = await TrainingRecord.findOne({
        staffNumber: staff.staffNumber,
        trainingModuleNumber,
        startDateOfTraining: startDate,
        isDeleted: false
      });

      if (duplicateExists) {
        duplicateCount++;
        duplicates.push({
          row: rowNum,
          reason: 'Duplicate record exists for this Staff Number + Module Number + Start Date combination',
          data: rowData
        });
        continue;
      }

      // 9. Save record
      const record = new TrainingRecord({
        staffNumber: staff.staffNumber,
        staffName: staff.staffName,
        emailId: staff.emailId,
        designation: staff.designation,
        groupName: (groupName && groupName !== '-') ? groupName : staff.groupName,
        productDivisionCategory: staff.productDivisionCategory,
        reportingGLManagerName: staff.reportingGLManagerName,
        employmentStatus: staff.employmentStatus,
        dateOfJoining: staff.dateOfJoining,
        superannuationDate: staff.superannuationDate,

        trainingTopic,
        trainingModuleNumber,
        trainerName,
        trainingInstituteName,
        typeOfTraining,
        trainingMode,
        trainingDurationHours: duration,
        startDateOfTraining: startDate,
        endDateOfTraining: endDate,
        requestProcessedDate,
        paymentDate,
        trainingStatus,
        trainingCostPerPerson,
        remarks,
        uploadBatchId: batchId,
        createdBy: userId
      });

      await record.save();
      successCount++;

      // Update upload status periodically (every 50 records)
      if (successCount % 50 === 0) {
        batch.successCount = successCount;
        batch.errorCount = errorCount;
        batch.duplicateCount = duplicateCount;
        await batch.save();
      }
    }

    // Complete upload batch logs
    batch.successCount = successCount;
    batch.errorCount = errorCount;
    batch.duplicateCount = duplicateCount;
    batch.errors = errors;
    batch.duplicates = duplicates;
    batch.status = 'completed';
    await batch.save();

  } catch (error) {
    console.error('Bulk upload engine failure:', error);
    batch.status = 'failed';
    batch.errors.push({
      row: 0,
      reason: `System upload failure: ${error.message}`,
      data: {}
    });
    await batch.save();
  }
};

/**
 * Validates and inserts staff rows chunk by chunk.
 */
const processStaffBulkUpload = async (filePath, batchId, userId) => {
  const batch = await UploadBatch.findOne({ batchId });
  if (!batch) return;

  try {
    const workbook = xlsx.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert sheet to raw 2D array of values
    const rawRows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    // Define column name aliases (flexible matching)
    const headerMapping = {
      staffNumber: ['staff number', 'staff no', 'staffid', 'staff id', 'employee number', 'employee no'],
      staffName: ['staff name', 'name', 'employee name', 'staffname'],
      emailId: ['email id', 'email', 'email address', 'emailid'],
      designation: ['designation', 'role/designation', 'job title', 'role'],
      groupName: ['group name', 'group', 'department/group', 'groupname', 'department'],
      productDivisionCategory: ['product division/category', 'product division', 'division', 'category', 'productdivisioncategory', 'product category', 'product division category'],
      reportingGLManagerName: ['reporting gl/manager name', 'reporting manager', 'manager name', 'reporting gl', 'reportingglmanagername', 'manager', 'reporting manager (gl)'],
      employmentStatus: ['employment status', 'status of employment', 'employmentstatus', 'status'],
      dateOfJoining: ['date of joining', 'joining date', 'dateofjoining', 'doj'],
      superannuationDate: ['superannuation date', 'superannuationdate', 'superannuation', 'retirement date']
    };

    let headerRowIndex = -1;
    let columnIndices = {};

    // 1. Identify which row is the header row
    for (let r = 0; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!Array.isArray(row)) continue;

      let matchedCount = 0;
      let tempIndices = {};

      row.forEach((cellVal, colIdx) => {
        const cleanVal = String(cellVal || '').trim().toLowerCase();
        if (cleanVal) {
          for (const [key, aliases] of Object.entries(headerMapping)) {
            if (aliases.includes(cleanVal)) {
              tempIndices[key] = colIdx;
              matchedCount++;
              break;
            }
          }
        }
      });

      // If we find 'staffNumber' and 'staffName', it's our header row
      if (tempIndices.staffNumber !== undefined && tempIndices.staffName !== undefined && matchedCount >= 2) {
        headerRowIndex = r;
        columnIndices = tempIndices;
        break;
      }
    }

    // Fallback: search for a row that simply contains 'Staff Number' case-insensitively
    if (headerRowIndex === -1) {
      for (let r = 0; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!Array.isArray(row)) continue;
        const hasStaffNo = row.some(cellVal => {
          const s = String(cellVal || '').trim().toLowerCase();
          return s === 'staff number' || s === 'staff no' || s === 'staff id';
        });
        if (hasStaffNo) {
          headerRowIndex = r;
          row.forEach((cellVal, colIdx) => {
            const cleanVal = String(cellVal || '').trim().toLowerCase();
            for (const [key, aliases] of Object.entries(headerMapping)) {
              if (aliases.includes(cleanVal)) {
                columnIndices[key] = colIdx;
                break;
              }
            }
          });
          break;
        }
      }
    }

    // Default Fallback: Assume row 0 is header row
    if (headerRowIndex === -1) {
      headerRowIndex = 0;
      const firstRow = rawRows[0] || [];
      firstRow.forEach((cellVal, colIdx) => {
        const cleanVal = String(cellVal || '').trim().toLowerCase();
        for (const [key, aliases] of Object.entries(headerMapping)) {
          if (aliases.includes(cleanVal)) {
            columnIndices[key] = colIdx;
            break;
          }
        }
      });
    }

    // Calculate total rows count excluding the header and empty rows
    const dataRows = rawRows.slice(headerRowIndex + 1).filter(row => row && row.length > 0 && !row.every(val => val === ''));
    batch.totalRows = dataRows.length;
    await batch.save();

    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    
    const errors = [];
    const duplicates = [];

    // Pre-cache all staff list (including soft-deleted) to prevent unique key violations
    const existingStaffList = await Staff.find({}).lean();
    const dbStaffMap = new Map();
    existingStaffList.forEach(s => {
      dbStaffMap.set(s.staffNumber.toUpperCase(), s);
    });

    // In-batch duplicate tracker
    const batchStaffNumbers = new Set();

    // Process rows sequentially
    for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0 || row.every(val => val === '')) continue;

      const rowNum = r + 1; // 1-indexed row number in the Excel file

      const getVal = (key) => {
        const idx = columnIndices[key];
        if (idx === undefined) return '';
        return row[idx] !== undefined ? row[idx] : '';
      };

      const staffNumber = String(getVal('staffNumber')).trim();
      const staffName = String(getVal('staffName')).trim();
      const emailId = String(getVal('emailId')).trim();
      const designation = String(getVal('designation')).trim() || '-';
      const groupName = String(getVal('groupName')).trim() || '-';
      const productDivisionCategory = String(getVal('productDivisionCategory')).trim() || '-';
      const reportingGLManagerName = String(getVal('reportingGLManagerName')).trim() || '-';
      const employmentStatusRaw = String(getVal('employmentStatus')).trim();
      const dateOfJoiningVal = getVal('dateOfJoining');
      const superannuationDateVal = getVal('superannuationDate');

      const rowData = {
        'Staff Number': staffNumber,
        'Staff Name': staffName,
        'Email ID': emailId,
        'Designation': designation,
        'Group Name': groupName,
        'Product Division / Category': productDivisionCategory,
        'Reporting GL / Manager Name': reportingGLManagerName,
        'Employment Status': employmentStatusRaw,
        'Date of Joining': dateOfJoiningVal,
        'Superannuation Date': superannuationDateVal
      };

      // 1. Check required fields
      if (!staffNumber || !staffName) {
        errorCount++;
        errors.push({
          row: rowNum,
          reason: 'Missing required fields (Staff Number and Staff Name are mandatory)',
          data: rowData
        });
        continue;
      }

      // 2. Validate email format if provided
      if (emailId) {
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(emailId)) {
          errorCount++;
          errors.push({
            row: rowNum,
            reason: `Invalid email format: "${emailId}"`,
            data: rowData
          });
          continue;
        }
      }

      // 3. Validate employment status enum
      let employmentStatus = 'Currently Serving';
      if (employmentStatusRaw) {
        const lowerStatus = employmentStatusRaw.toLowerCase();
        if (lowerStatus === 'currently serving') {
          employmentStatus = 'Currently Serving';
        } else if (lowerStatus === 'resigned') {
          employmentStatus = 'Resigned';
        } else if (lowerStatus === 'retired') {
          employmentStatus = 'Retired';
        } else {
          errorCount++;
          errors.push({
            row: rowNum,
            reason: 'Invalid Employment Status. Allowed values: Currently Serving, Resigned, Retired',
            data: rowData
          });
          continue;
        }
      }

      // 4. Parse date fields
      let dateOfJoining = null;
      if (dateOfJoiningVal === undefined || dateOfJoiningVal === '') {
        dateOfJoining = null;
      } else {
        dateOfJoining = parseDateValue(dateOfJoiningVal);
        if (!dateOfJoining) {
          errorCount++;
          errors.push({
            row: rowNum,
            reason: 'Invalid Date of Joining format. Standard formats allowed are DD/MM/YYYY or YYYY-MM-DD.',
            data: rowData
          });
          continue;
        }
      }

      let superannuationDate = null;
      if (superannuationDateVal !== undefined && superannuationDateVal !== '') {
        superannuationDate = parseDateValue(superannuationDateVal);
        if (!superannuationDate) {
          errorCount++;
          errors.push({
            row: rowNum,
            reason: 'Invalid Superannuation Date format. Standard formats allowed are DD/MM/YYYY or YYYY-MM-DD.',
            data: rowData
          });
          continue;
        }
      }

      // Check dates logic
      if (superannuationDate && superannuationDate < dateOfJoining) {
        errorCount++;
        errors.push({
          row: rowNum,
          reason: 'Superannuation Date cannot be prior to Date of Joining',
          data: rowData
        });
        continue;
      }

      // 5. Duplicate check (within same batch)
      const staffNumberUpper = staffNumber.toUpperCase();
      if (batchStaffNumbers.has(staffNumberUpper)) {
        duplicateCount++;
        duplicates.push({
          row: rowNum,
          reason: `Duplicate Staff Number "${staffNumber}" found within the uploaded spreadsheet`,
          data: rowData
        });
        continue;
      }
      batchStaffNumbers.add(staffNumberUpper);

      // 6. Duplicate check (against database)
      if (dbStaffMap.has(staffNumberUpper)) {
        const existing = dbStaffMap.get(staffNumberUpper);
        if (existing.isDeleted) {
          // Reactivate/restore the soft-deleted staff member
          try {
            await Staff.updateOne({ _id: existing._id }, {
              isDeleted: false,
              staffName,
              emailId: emailId ? emailId.toLowerCase() : undefined,
              designation,
              groupName,
              productDivisionCategory,
              reportingGLManagerName,
              employmentStatus,
              dateOfJoining,
              superannuationDate,
              updatedBy: userId
            });
            const { syncStaffMasterFields } = require('../utils/masterSync');
            await syncStaffMasterFields({ designation, groupName, productDivisionCategory });
            
            // Log reactivation in audit log
            await logAudit({
              userId,
              userEmail: (await User.findById(userId))?.email || 'system',
              action: AUDIT_ACTIONS.UPDATE,
              module: 'Staff',
              recordId: existing._id,
              before: existing,
              after: {
                ...existing,
                isDeleted: false,
                staffName,
                emailId,
                designation,
                groupName,
                productDivisionCategory,
                reportingGLManagerName,
                employmentStatus,
                dateOfJoining,
                superannuationDate
              },
              ipAddress: 'bulk-import'
            });

            // Update local map to reflect reactivation
            existing.isDeleted = false;
            dbStaffMap.set(staffNumberUpper, existing);
            successCount++;
            continue;
          } catch (err) {
            errorCount++;
            errors.push({
              row: rowNum,
              reason: `Failed to restore soft-deleted staff member: ${err.message}`,
              data: rowData
            });
            continue;
          }
        } else {
          // Overwrite existing active staff member details if changed
          let needsUpdate = false;
          const updateData = {};

          if (emailId && emailId.toLowerCase() !== (existing.emailId || '').toLowerCase()) {
            existing.emailId = emailId.toLowerCase();
            updateData.emailId = emailId.toLowerCase();
            needsUpdate = true;
          }
          if (staffName && staffName !== existing.staffName) {
            existing.staffName = staffName;
            updateData.staffName = staffName;
            needsUpdate = true;
          }
          if (designation && designation !== existing.designation) {
            existing.designation = designation;
            updateData.designation = designation;
            needsUpdate = true;
          }
          if (groupName && groupName !== existing.groupName) {
            existing.groupName = groupName;
            updateData.groupName = groupName;
            needsUpdate = true;
          }
          if (productDivisionCategory && productDivisionCategory !== existing.productDivisionCategory) {
            existing.productDivisionCategory = productDivisionCategory;
            updateData.productDivisionCategory = productDivisionCategory;
            needsUpdate = true;
          }
          if (reportingGLManagerName && reportingGLManagerName !== existing.reportingGLManagerName) {
            existing.reportingGLManagerName = reportingGLManagerName;
            updateData.reportingGLManagerName = reportingGLManagerName;
            needsUpdate = true;
          }
          if (employmentStatus && employmentStatus !== existing.employmentStatus) {
            existing.employmentStatus = employmentStatus;
            updateData.employmentStatus = employmentStatus;
            needsUpdate = true;
          }
          
          const existingDojTime = existing.dateOfJoining ? new Date(existing.dateOfJoining).getTime() : null;
          const newDojTime = dateOfJoining ? new Date(dateOfJoining).getTime() : null;
          if (newDojTime !== existingDojTime) {
            existing.dateOfJoining = dateOfJoining;
            updateData.dateOfJoining = dateOfJoining;
            needsUpdate = true;
          }

          const existingSuperTime = existing.superannuationDate ? new Date(existing.superannuationDate).getTime() : null;
          const newSuperTime = superannuationDate ? new Date(superannuationDate).getTime() : null;
          if (newSuperTime !== existingSuperTime) {
            existing.superannuationDate = superannuationDate;
            updateData.superannuationDate = superannuationDate;
            needsUpdate = true;
          }

          if (needsUpdate) {
            try {
              updateData.updatedBy = userId;
              await Staff.updateOne({ _id: existing._id }, { $set: updateData });
              
              const { syncStaffMasterFields } = require('../utils/masterSync');
              await syncStaffMasterFields(existing);

              // Log update in audit log
              await logAudit({
                userId,
                userEmail: (await User.findById(userId))?.email || 'system',
                action: AUDIT_ACTIONS.UPDATE,
                module: 'Staff',
                recordId: existing._id,
                before: dbStaffMap.get(staffNumberUpper),
                after: {
                  ...existing,
                  ...updateData
                },
                ipAddress: 'bulk-import'
              });

              dbStaffMap.set(staffNumberUpper, existing);
            } catch (err) {
              errorCount++;
              errors.push({
                row: rowNum,
                reason: `Failed to update existing staff details: ${err.message}`,
                data: rowData
              });
              continue;
            }
          }
          successCount++;
          continue;
        }
      }

      // 7. Save Staff record
      try {
        const staffObj = new Staff({
          staffNumber,
          staffName,
          emailId: emailId ? emailId.toLowerCase() : undefined,
          designation,
          groupName,
          productDivisionCategory,
          reportingGLManagerName,
          employmentStatus,
          dateOfJoining,
          superannuationDate,
          createdBy: userId
        });
        await staffObj.save();
        const { syncStaffMasterFields } = require('../utils/masterSync');
        await syncStaffMasterFields(staffObj);
        
        dbStaffMap.set(staffNumberUpper, staffObj.toObject());
        successCount++;

        // Update upload status periodically (every 50 records)
        if (successCount % 50 === 0) {
          batch.successCount = successCount;
          batch.errorCount = errorCount;
          batch.duplicateCount = duplicateCount;
          await batch.save();
        }
      } catch (err) {
        errorCount++;
        errors.push({
          row: rowNum,
          reason: `Database error: ${err.message}`,
          data: rowData
        });
      }
    }

    // Complete upload batch logs
    batch.successCount = successCount;
    batch.errorCount = errorCount;
    batch.duplicateCount = duplicateCount;
    batch.errors = errors;
    batch.duplicates = duplicates;
    batch.status = 'completed';
    await batch.save();

  } catch (error) {
    console.error('Bulk staff upload engine failure:', error);
    batch.status = 'failed';
    batch.errors.push({
      row: 0,
      reason: `System staff upload failure: ${error.message}`,
      data: {}
    });
    await batch.save();
  }
};

module.exports = {
  processBulkUpload,
  processStaffBulkUpload
};
