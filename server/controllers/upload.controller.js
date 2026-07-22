const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { v4: uuidv4 } = require('uuid');
const UploadBatch = require('../models/UploadBatch');
const uploadService = require('../services/upload.service');
const { logAudit } = require('../middleware/auditLogger');
const { AUDIT_ACTIONS } = require('../config/constants');
const { getPaginationOptions, getPaginationMeta } = require('../utils/pagination');
const { sendSuccess, sendError } = require('../utils/response');

// @desc    Upload CSV/Excel file for processing training records
// @route   POST /api/v1/upload/training
// @access  Private (Admin + Super Admin)
const uploadTrainingFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return sendError(res, 'No file uploaded', [], 400);
    }

    const batchId = uuidv4();
    const batch = new UploadBatch({
      batchId,
      fileName: req.file.originalname,
      uploadedBy: req.user._id,
      status: 'processing'
    });
    await batch.save();

    await logAudit({
      userId: req.user._id,
      userEmail: req.user.email,
      action: AUDIT_ACTIONS.BULK_UPLOAD,
      module: 'UploadBatch',
      recordId: batch._id,
      ipAddress: req.ip
    });

    // Start background processing so large uploads do not time out
    // uploadService is entirely asynchronous and updates DB periodically
    uploadService.processBulkUpload(req.file.path, batchId, req.user._id)
      .then(() => {
        // Clean up uploaded temp file
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error('Failed to delete temp file:', err);
        }
      })
      .catch((err) => {
        console.error('Async upload processor failed:', err);
      });

    return sendSuccess(res, 'File uploaded and is currently processing.', { batchId }, null, 202);
  } catch (error) {
    next(error);
  }
};

// @desc    Download CSV/Excel import template
// @route   GET /api/v1/upload/template
// @access  Private (Admin + Super Admin)
const downloadTemplate = async (req, res, next) => {
  try {
    const { format, type } = req.query; // format: 'excel' or 'csv', type: 'training' or 'staff'
    const isStaff = type === 'staff';

    let headers, sampleRow, instructions, filenameExcel, filenameCsv;

    if (isStaff) {
      headers = [
        'Staff Number',
        'Staff Name',
        'Email ID',
        'Designation',
        'Group Name',
        'Product Division Category',
        'Reporting Manager (GL)',
        'Employment Status',
        'Date of Joining',
        'Superannuation Date'
      ];

      sampleRow = [
        'S10001',
        'abc',
        'abc@tms.com',
        'Senior Engineer',
        'Product Development',
        'R&D',
        'John Smith',
        'Currently Serving',
        '15/06/2026',
        '15/06/2056'
      ];

      instructions = [
        ['Staff Number', 'Yes', 'String (e.g. S10001)', 'Unique identifier for the staff member.'],
        ['Staff Name', 'Yes', 'String (e.g. abc)', 'Full name of the staff member.'],
        ['Email ID', 'No', 'Valid email format', 'Official email address.'],
        ['Designation', 'No', 'String', 'Designation / job title.'],
        ['Group Name', 'No', 'String', 'Department / group name.'],
        ['Product Division Category', 'No', 'String', 'Division or category classification.'],
        ['Reporting Manager (GL)', 'No', 'String', 'Name of the reporting manager.'],
        ['Employment Status', 'No', 'Currently Serving, Resigned, Retired', 'Defaults to "Currently Serving" if blank.'],
        ['Date of Joining', 'No', 'DD/MM/YYYY or YYYY-MM-DD', 'Defaults to current date if blank.'],
        ['Superannuation Date', 'No', 'DD/MM/YYYY or YYYY-MM-DD', 'Retirement date (must be >= Date of Joining).']
      ];

      filenameExcel = 'TMS_Staff_Upload_Template.xlsx';
      filenameCsv = 'TMS_Staff_Upload_Template.csv';
    } else {
      headers = [
        'Staff Number',
        'Staff Name',
        'Email ID',
        'Group Name',
        'Training Topic',
        'Training Module Number',
        'Trainer Name',
        'Training Institute Name',
        'Type of Training',
        'Training Mode',
        'Training Duration Hours',
        'Start Date',
        'End Date',
        'Request Processed Date',
        'Payment Date',
        'Training Status',
        'Training Cost Per Person',
        'Remarks'
      ];

      sampleRow = [
        'S10001',
        'abc',
        'abc@tms.com',
        'Product Development',
        'React and Tailwind Integration',
        'MOD-RCT-201',
        'John Doe',
        'TMS Tech Academy',
        'OT',
        'Online',
        '12.5',
        '15/06/2026',
        '17/06/2026',
        '15/06/2026',
        '18/06/2026',
        'Completed',
        '1500',
        'Optional comment'
      ];

      instructions = [
        ['Staff Number', 'Yes', 'String (e.g. S10001)', 'Must exist in Staff Master list.'],
        ['Staff Name', 'No', 'String (e.g. abc)', 'Optional. Full name of the staff member.'],
        ['Email ID', 'No', 'Valid email format', 'Optional. Official email address.'],
        ['Group Name', 'No', 'String', 'Optional. Group or department name (falls back to Staff Master group if empty).'],
        ['Training Topic', 'Yes', 'String (e.g. React and Tailwind Integration)', 'Topic of the course.'],
        ['Training Module Number', 'Yes', 'Alphanumeric with dashes/underscores', 'Unique module identifier.'],
        ['Trainer Name', 'No', 'String', 'Name of instructor.'],
        ['Training Institute Name', 'No', 'String', 'Name of training agency.'],
        ['Type of Training', 'Yes', 'OT, Training for external members, Group specific, Others', 'Type of training.'],
        ['Training Mode', 'Yes', 'Online, Offline, Others', 'Mode of training.'],
        ['Training Duration Hours', 'Yes', 'Decimal number >= 0.5', 'Course duration hours.'],
        ['Start Date', 'Yes', 'DD/MM/YYYY or YYYY-MM-DD', 'Date training started.'],
        ['End Date', 'Yes', 'DD/MM/YYYY or YYYY-MM-DD', 'Date training ended. Must be >= Start Date.'],
        ['Request Processed Date', 'Yes', 'DD/MM/YYYY or YYYY-MM-DD', 'Date request processed. Must be >= Start Date.'],
        ['Payment Date', 'No', 'DD/MM/YYYY or YYYY-MM-DD', 'Optional. Date when the training payment was processed.'],
        ['Training Status', 'Yes', 'Completed, Not Completed, Cancelled', 'Status of completion.'],
        ['Training Cost Per Person', 'No', 'Number (defaults to 0)', 'Cost per staff member in ₹.'],
        ['Remarks', 'No', 'String', 'Optional remarks/notes about the training.']
      ];

      filenameExcel = 'TMS_Bulk_Upload_Template.xlsx';
      filenameCsv = 'TMS_Bulk_Upload_Template.csv';
    }

    if (format === 'csv') {
      const csvContent = '\ufeff' + [headers.join(','), sampleRow.join(',')].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filenameCsv}`);
      return res.send(csvContent);
    }

    // Default: Excel format
    const workbook = new ExcelJS.Workbook();
    
    // Worksheet 1: Template Data Row
    const worksheet = workbook.addWorksheet('Template');
    worksheet.addRow(headers);
    worksheet.addRow(sampleRow);

    // Style template header
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E79' }
      };
    });

    worksheet.columns.forEach(col => {
      col.width = 24;
    });

    // Worksheet 2: Instruction Sheet / Notes
    const notesSheet = workbook.addWorksheet('Instructions');
    notesSheet.addRow(['Field Name', 'Required', 'Allowed Values / Formats', 'Description']);
    
    instructions.forEach(row => notesSheet.addRow(row));

    notesSheet.getRow(1).eachCell((cell) => {
      cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF595959' }
      };
    });

    notesSheet.columns.forEach(col => {
      col.width = 28;
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filenameExcel}`);
    const buffer = await workbook.xlsx.writeBuffer();
    return res.send(buffer);

  } catch (error) {
    next(error);
  }
};

// @desc    List all upload batches
// @route   GET /api/v1/upload/batches
// @access  Private (Admin + Super Admin)
const getUploadBatches = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationOptions(req.query);
    
    const query = {};
    const total = await UploadBatch.countDocuments(query);
    const batches = await UploadBatch.find(query)
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const pagination = getPaginationMeta(total, page, limit);

    return sendSuccess(res, 'Upload batches fetched successfully', batches, pagination);
  } catch (error) {
    next(error);
  }
};

// @desc    Get upload batch detail (includes paginated list of duplicates & validation errors)
// @route   GET /api/v1/upload/batches/:batchId
// @access  Private (Admin + Super Admin)
const getUploadBatchById = async (req, res, next) => {
  try {
    const batch = await UploadBatch.findOne({ batchId: req.params.batchId })
      .populate('uploadedBy', 'name email')
      .lean();

    if (!batch) {
      return sendError(res, 'Upload batch not found', [], 404);
    }

    return sendSuccess(res, 'Upload batch details fetched successfully', batch);
  } catch (error) {
    next(error);
  }
};

// @desc    Download Excel report of validation errors/duplicates for a batch
// @route   GET /api/v1/upload/batches/:batchId/error-report
// @access  Private (Admin + Super Admin)
const downloadErrorReport = async (req, res, next) => {
  try {
    const batch = await UploadBatch.findOne({ batchId: req.params.batchId }).lean();
    if (!batch) {
      return sendError(res, 'Upload batch not found', [], 404);
    }

    const workbook = new ExcelJS.Workbook();
    
    // Sheet 1: Validation Errors
    const errSheet = workbook.addWorksheet('Validation Errors');
    errSheet.addRow(['Row Number', 'Error Reason', 'Original Row Data']);
    batch.errors.forEach(err => {
      errSheet.addRow([
        err.row,
        err.reason,
        JSON.stringify(err.data)
      ]);
    });
    errSheet.getRow(1).eachCell(cell => {
      cell.font = { name: 'Segoe UI', bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC00000' } }; // Red header
    });
    errSheet.columns.forEach(col => col.width = 25);
    errSheet.columns[2].width = 60;

    // Sheet 2: Duplicates Skip Report
    const dupSheet = workbook.addWorksheet('Duplicate Rows');
    dupSheet.addRow(['Row Number', 'Duplicate Reason', 'Original Row Data']);
    batch.duplicates.forEach(dup => {
      dupSheet.addRow([
        dup.row,
        dup.reason,
        JSON.stringify(dup.data)
      ]);
    });
    dupSheet.getRow(1).eachCell(cell => {
      cell.font = { name: 'Segoe UI', bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE36C09' } }; // Orange header
    });
    dupSheet.columns.forEach(col => col.width = 25);
    dupSheet.columns[2].width = 60;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=KMG_TMS_Error_Report_Batch_${req.params.batchId}.xlsx`);
    const buffer = await workbook.xlsx.writeBuffer();
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

// @desc    Upload CSV/Excel file for processing staff roster records
// @route   POST /api/v1/upload/staff
// @access  Private (Super Admin)
const uploadStaffFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return sendError(res, 'No file uploaded', [], 400);
    }

    const batchId = uuidv4();
    const batch = new UploadBatch({
      batchId,
      fileName: req.file.originalname,
      uploadedBy: req.user._id,
      batchType: 'staff',
      status: 'processing'
    });
    await batch.save();

    await logAudit({
      userId: req.user._id,
      userEmail: req.user.email,
      action: AUDIT_ACTIONS.BULK_UPLOAD,
      module: 'UploadBatch',
      recordId: batch._id,
      ipAddress: req.ip
    });

    // Start background processing
    uploadService.processStaffBulkUpload(req.file.path, batchId, req.user._id)
      .then(() => {
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error('Failed to delete temp staff file:', err);
        }
      })
      .catch((err) => {
        console.error('Async staff upload processor failed:', err);
      });

    return sendSuccess(res, 'File uploaded and is currently processing.', { batchId }, null, 202);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadTrainingFile,
  uploadStaffFile,
  downloadTemplate,
  getUploadBatches,
  getUploadBatchById,
  downloadErrorReport
};
