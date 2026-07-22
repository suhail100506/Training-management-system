import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { toast, ToastContainer } from 'react-toastify';
import { 
  FileSpreadsheet, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  FileText, 
  Download,
  Loader2,
  Play,
  ArrowRight,
  Eye,
  History,
  ArrowLeft
} from 'lucide-react';
import { saveAs } from 'file-saver';

import * as uploadApi from '../../api/upload.api';
import PageTitle from '../../components/common/PageTitle';

import 'react-toastify/dist/ReactToastify.css';

const StaffImportPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = Template, 2 = Drop, 3 = Progress & Results
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // Progress/Polling States
  const [batchId, setBatchId] = useState(null);
  const [batchDetail, setBatchDetail] = useState(null);
  const pollIntervalRef = useRef(null);

  // Drag and Drop Zone Config
  const onDrop = (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
      setStep(2);
      toast.success(`File ${acceptedFiles[0].name} selected.`);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false
  });

  const handleDownloadTemplate = async (format) => {
    try {
      const response = await uploadApi.downloadTemplate(format, 'staff');
      const ext = format === 'csv' ? 'csv' : 'xlsx';
      const type = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const blob = new Blob([response.data], { type });
      saveAs(blob, `TMS_Staff_Upload_Template.${ext}`);
      toast.success('Staff import template downloaded.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to download template.');
    }
  };

  const startUploadAndValidate = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setStep(3);

    try {
      // 1. Submit file to start async upload process
      const response = await uploadApi.uploadStaffFile(selectedFile);
      const { batchId: serverBatchId } = response.data.data;
      setBatchId(serverBatchId);
      toast.info('File uploaded. Parsing staff records in background...');

      // 2. Setup periodic status polling (every 2 seconds)
      pollIntervalRef.current = setInterval(() => {
        checkBatchStatus(serverBatchId);
      }, 2000);

    } catch (err) {
      console.error('Upload error:', err);
      const errMsg = err.response?.data?.message || 'Failed to upload file.';
      toast.error(errMsg);
      setUploading(false);
      setStep(2);
    }
  };

  const checkBatchStatus = async (id) => {
    try {
      const response = await uploadApi.getUploadBatchById(id);
      const details = response.data.data;
      setBatchDetail(details);

      if (details.status === 'completed' || details.status === 'failed') {
        clearInterval(pollIntervalRef.current);
        setUploading(false);
        if (details.status === 'completed') {
          toast.success('Bulk staff roster processing complete!');
        } else {
          toast.error('Bulk staff import process failed.');
        }
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  };

  const handleDownloadErrors = async () => {
    if (!batchId) return;
    try {
      const response = await uploadApi.downloadErrorReport(batchId);
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `TMS_Staff_Upload_Error_Report_${batchId}.xlsx`);
      toast.success('Error report downloaded.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to download error report.');
    }
  };

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            to="/staff"
            className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </Link>
          <PageTitle title="Bulk Staff Import" subtitle="Import staff master roster in bulk via CSV or Excel worksheets" />
        </div>
        
        <Link
          to="/bulk-upload/history"
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 hover:bg-slate-55 dark:hover:bg-slate-850 rounded-xl text-xs font-bold shadow-sm transition-all"
        >
          <History className="w-4 h-4" />
          <span>Upload History</span>
        </Link>
      </div>

      {/* Step Progress indicators */}
      <div className="grid grid-cols-3 gap-2 border-b border-slate-200 dark:border-slate-850 pb-4 text-xs font-bold text-slate-400">
        <div className={`pb-2 border-b-2 transition-colors ${step >= 1 ? 'border-brand-700 text-brand-700 dark:border-brand-400 dark:text-brand-400' : 'border-transparent'}`}>
          1. Download Import Template
        </div>
        <div className={`pb-2 border-b-2 transition-colors ${step >= 2 ? 'border-brand-700 text-brand-700 dark:border-brand-400 dark:text-brand-400' : 'border-transparent'}`}>
          2. Drop and Select File
        </div>
        <div className={`pb-2 border-b-2 transition-colors ${step >= 3 ? 'border-brand-700 text-brand-700 dark:border-brand-400 dark:text-brand-400' : 'border-transparent'}`}>
          3. Process & View Results
        </div>
      </div>

      {/* STEP 1: Download template */}
      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850/50 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Excel/CSV Import Requirements</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              To import staff members, please download our official template spreadsheet. Make sure to preserve the exact column headers.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => handleDownloadTemplate('excel')}
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-bold rounded-xl text-xs transition-all shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Download Excel template (.xlsx)</span>
              </button>

              <button
                onClick={() => handleDownloadTemplate('csv')}
                className="inline-flex items-center space-x-2 px-4 py-2.5 border border-brand-700 text-brand-700 dark:border-brand-500 dark:text-brand-400 hover:bg-brand-50 font-bold rounded-xl text-xs transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download CSV template (.csv)</span>
              </button>
            </div>
          </div>

          {/* Quick Instructions Panel */}
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800/40 rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Required Fields Check</h4>
            <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400 list-disc list-inside">
              <li><strong>Staff Number:</strong> REQUIRED (Must be unique)</li>
              <li><strong>Staff Name:</strong> REQUIRED (Full name)</li>
              <li><strong>Email ID:</strong> Optional (Valid email formatting)</li>
              <li><strong>Designation:</strong> Optional</li>
              <li><strong>Group Name:</strong> Optional</li>
              <li><strong>Product Division Category:</strong> Optional</li>
              <li><strong>Reporting Manager (GL):</strong> Optional</li>
              <li><strong>Employment Status:</strong> REQUIRED (Currently Serving, Resigned, Retired)</li>
              <li><strong>Date of Joining:</strong> Optional (DD/MM/YYYY or YYYY-MM-DD)</li>
              <li><strong>Superannuation Date:</strong> Optional (DD/MM/YYYY or YYYY-MM-DD, must be &gt;= Joining Date)</li>
            </ul>
            <div className="pt-2">
              <button
                onClick={() => setStep(2)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-1 transition-all"
              >
                <span>Continue to Upload</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Drag and drop files */}
      {step === 2 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850/50 rounded-2xl p-6 shadow-sm space-y-6">
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
              isDragActive 
                ? 'border-brand-700 bg-brand-50/25 dark:border-brand-400 dark:bg-brand-950/20' 
                : 'border-slate-350 hover:border-slate-400 dark:border-slate-800'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center space-y-3">
              <Upload className="w-12 h-12 text-slate-400 animate-bounce" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800 dark:text-white">
                  Drag and drop your spreadsheet here
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Supports Excel (.xlsx, .xls) and CSV (.csv) up to 10MB
                </p>
              </div>
            </div>
          </div>

          {selectedFile && (
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/55 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3 text-xs">
                <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                <div>
                  <p className="font-bold text-slate-900 dark:text-white truncate max-w-xs">{selectedFile.name}</p>
                  <p className="text-[10px] text-slate-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedFile(null)}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs hover:bg-slate-100 text-slate-600 dark:text-slate-300 transition-all"
                >
                  Clear File
                </button>
                <button
                  onClick={startUploadAndValidate}
                  className="px-4 py-1.5 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Start Validation</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Progress & results details */}
      {step === 3 && (
        <div className="space-y-6">
          
          {/* Progress / Spinner Loader */}
          {uploading && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850/50 rounded-2xl p-6 shadow-sm space-y-4 text-center">
              <Loader2 className="w-10 h-10 text-brand-700 dark:text-brand-400 animate-spin mx-auto" />
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Processing Staff Spreadsheet Rows</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Validating attributes formatting, checking for existing staff numbers in master roster, and verifying fields...
                </p>
              </div>
              
              {/* Progress Count Details */}
              {batchDetail && (
                <div className="max-w-xs mx-auto space-y-1 text-xs">
                  <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                    <span>Processed:</span>
                    <span>{batchDetail.successCount + batchDetail.errorCount + batchDetail.duplicateCount} / {batchDetail.totalRows}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-brand-700 h-full transition-all duration-300"
                      style={{ 
                        width: `${batchDetail.totalRows > 0 ? ((batchDetail.successCount + batchDetail.errorCount + batchDetail.duplicateCount) / batchDetail.totalRows) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results Summary Card */}
          {batchDetail && !uploading && (
            <div className="space-y-6">
              
              {/* Core metrics summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                {/* Total rows */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-850/50 text-center space-y-1 shadow-sm">
                  <FileText className="w-5 h-5 text-slate-500 mx-auto" />
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white">{batchDetail.totalRows}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Rows</p>
                </div>

                {/* Successful rows */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-850/50 text-center space-y-1 shadow-sm">
                  <CheckCircle className="w-5 h-5 text-emerald-600 mx-auto" />
                  <p className="text-xl font-extrabold text-emerald-600">{batchDetail.successCount}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Inserted Successfully</p>
                </div>

                {/* Duplicates skipped */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-850/50 text-center space-y-1 shadow-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto" />
                  <p className="text-xl font-extrabold text-amber-500">{batchDetail.duplicateCount}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Duplicate Roster Skips</p>
                </div>

                {/* Errors flagged */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-850/50 text-center space-y-1 shadow-sm">
                  <XCircle className="w-5 h-5 text-red-600 mx-auto" />
                  <p className="text-xl font-extrabold text-red-600">{batchDetail.errorCount}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Validation Errors</p>
                </div>

              </div>

              {/* Validation Action Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <p className="font-semibold text-slate-800 dark:text-white">Batch ID: {batchDetail.batchId}</p>
                  <p className="mt-0.5">Filename: {batchDetail.fileName}</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {batchDetail.errorCount + batchDetail.duplicateCount > 0 && (
                    <button
                      onClick={handleDownloadErrors}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-red-650 hover:bg-red-750 text-white font-bold rounded-xl text-xs transition-all shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Error Report</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setBatchDetail(null);
                      setStep(2);
                    }}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 hover:bg-slate-55 rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <span>Upload Another File</span>
                  </button>

                  <Link
                    to="/staff"
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Roster</span>
                  </Link>
                </div>
              </div>

              {/* Errors report lists */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Validation Errors Table */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850/50 rounded-2xl p-5 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-red-655 uppercase tracking-wider flex items-center space-x-1.5">
                    <XCircle className="w-4 h-4" />
                    <span>Validation Failure Rows ({batchDetail.errors.length})</span>
                  </h4>
                  <div className="overflow-y-auto max-h-60 border border-slate-100 dark:border-slate-850 rounded-xl">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 text-slate-500 font-bold">
                          <th className="px-4 py-2 w-16">Row #</th>
                          <th className="px-4 py-2 w-48">Reason</th>
                          <th className="px-4 py-2">Data Fragment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-850 dark:text-slate-350">
                        {batchDetail.errors.map((err, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20">
                            <td className="px-4 py-2 font-bold">{err.row}</td>
                            <td className="px-4 py-2 text-red-500 font-semibold">{err.reason}</td>
                            <td className="px-4 py-2 font-mono text-[9px] truncate max-w-xs">{JSON.stringify(err.data)}</td>
                          </tr>
                        ))}
                        {batchDetail.errors.length === 0 && (
                          <tr>
                            <td colSpan={3} className="text-center py-4 text-slate-400">No validation failures logged.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Duplicate Rows Table */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850/50 rounded-2xl p-5 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Duplicate Skipping Rows ({batchDetail.duplicates.length})</span>
                  </h4>
                  <div className="overflow-y-auto max-h-60 border border-slate-100 dark:border-slate-850 rounded-xl">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 text-slate-500 font-bold">
                          <th className="px-4 py-2 w-16">Row #</th>
                          <th className="px-4 py-2 w-48">Reason</th>
                          <th className="px-4 py-2">Data Fragment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-850 dark:text-slate-350">
                        {batchDetail.duplicates.map((dup, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20">
                            <td className="px-4 py-2 font-bold">{dup.row}</td>
                            <td className="px-4 py-2 text-amber-500 font-semibold">{dup.reason}</td>
                            <td className="px-4 py-2 font-mono text-[9px] truncate max-w-xs">{JSON.stringify(dup.data)}</td>
                          </tr>
                        ))}
                        {batchDetail.duplicates.length === 0 && (
                          <tr>
                            <td colSpan={3} className="text-center py-4 text-slate-400">No duplicate skips logged.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      )}

      <ToastContainer position="top-right" autoClose={5000} />
    </div>
  );
};

export default StaffImportPage;
