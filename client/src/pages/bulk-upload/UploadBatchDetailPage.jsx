import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { 
  ArrowLeft, 
  Download, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  FileText,
  RefreshCw 
} from 'lucide-react';
import { saveAs } from 'file-saver';

import * as uploadApi from '../../api/upload.api';
import PageTitle from '../../components/common/PageTitle';

import 'react-toastify/dist/ReactToastify.css';

const UploadBatchDetailPage = () => {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBatch = async () => {
      try {
        const response = await uploadApi.getUploadBatchById(batchId);
        setBatch(response.data.data);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load upload batch details.');
        navigate('/bulk-upload/history');
      } finally {
        setLoading(false);
      }
    };
    fetchBatch();
  }, [batchId, navigate]);

  const handleDownloadErrors = async () => {
    try {
      const response = await uploadApi.downloadErrorReport(batchId);
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `TMS_Upload_Error_Report_${batchId}.xlsx`);
      toast.success('Error report downloaded.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to download error report.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <RefreshCw className="w-8 h-8 text-brand-700 animate-spin" />
        <span className="text-sm text-slate-500 font-medium">Loading batch metrics...</span>
      </div>
    );
  }

  if (!batch) return null;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            to="/bulk-upload/history"
            className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </Link>
          <PageTitle title={`Batch Details`} subtitle={`Upload task log for file: ${batch.fileName}`} />
        </div>

        {batch.errorCount + batch.duplicateCount > 0 && (
          <button
            onClick={handleDownloadErrors}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-red-650 hover:bg-red-750 text-white font-bold rounded-xl text-xs transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Download Error Report</span>
          </button>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-850/50 text-center space-y-1 shadow-sm">
          <FileText className="w-5 h-5 text-slate-500 mx-auto" />
          <p className="text-xl font-extrabold text-slate-900 dark:text-white">{batch.totalRows}</p>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Rows</p>
        </div>

        {/* Success */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-850/50 text-center space-y-1 shadow-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600 mx-auto" />
          <p className="text-xl font-extrabold text-emerald-600">{batch.successCount}</p>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Inserted Successfully</p>
        </div>

        {/* Duplicates */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-850/50 text-center space-y-1 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto" />
          <p className="text-xl font-extrabold text-amber-500">{batch.duplicateCount}</p>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Duplicate Skips</p>
        </div>

        {/* Errors */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-850/50 text-center space-y-1 shadow-sm">
          <XCircle className="w-5 h-5 text-red-655 mx-auto" />
          <p className="text-xl font-extrabold text-red-655">{batch.errorCount}</p>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Validation Errors</p>
        </div>
      </div>

      {/* Meta Summary Info */}
      <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/55 dark:border-slate-800 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-slate-400">Batch UUID:</span>
            <p className="font-mono font-bold mt-0.5 text-slate-800 dark:text-white">{batch.batchId}</p>
          </div>
          <div>
            <span className="text-slate-400">Uploaded By:</span>
            <p className="font-bold mt-0.5 text-slate-800 dark:text-white">{batch.uploadedBy?.name || 'System'} ({batch.uploadedBy?.email})</p>
          </div>
          <div>
            <span className="text-slate-400">Upload Date/Time:</span>
            <p className="font-bold mt-0.5 text-slate-800 dark:text-white">{new Date(batch.createdAt).toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Tables segment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Validation Errors Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850/50 rounded-2xl p-5 shadow-sm space-y-3">
          <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center space-x-1.5">
            <XCircle className="w-4 h-4" />
            <span>Validation Failure Rows ({batch.errors.length})</span>
          </h4>
          <div className="overflow-y-auto max-h-80 border border-slate-100 dark:border-slate-850 rounded-xl">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 text-slate-500 font-bold">
                  <th className="px-4 py-2.5 w-16">Row #</th>
                  <th className="px-4 py-2.5 w-48">Reason</th>
                  <th className="px-4 py-2.5">Original Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 dark:text-slate-350">
                {batch.errors.map((err, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20">
                    <td className="px-4 py-2 font-bold">{err.row}</td>
                    <td className="px-4 py-2 text-red-500 font-semibold">{err.reason}</td>
                    <td className="px-4 py-2 font-mono text-[9px] truncate max-w-xs">{JSON.stringify(err.data)}</td>
                  </tr>
                ))}
                {batch.errors.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-6 text-slate-400">No validation failures logged.</td>
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
            <span>Duplicate Skipping Rows ({batch.duplicates.length})</span>
          </h4>
          <div className="overflow-y-auto max-h-80 border border-slate-100 dark:border-slate-850 rounded-xl">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 text-slate-500 font-bold">
                  <th className="px-4 py-2.5 w-16">Row #</th>
                  <th className="px-4 py-2.5 w-48">Reason</th>
                  <th className="px-4 py-2.5">Original Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 dark:text-slate-350">
                {batch.duplicates.map((dup, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20">
                    <td className="px-4 py-2 font-bold">{dup.row}</td>
                    <td className="px-4 py-2 text-amber-500 font-semibold">{dup.reason}</td>
                    <td className="px-4 py-2 font-mono text-[9px] truncate max-w-xs">{JSON.stringify(dup.data)}</td>
                  </tr>
                ))}
                {batch.duplicates.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-6 text-slate-400">No duplicate skips logged.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <ToastContainer position="top-right" autoClose={5000} />
    </div>
  );
};

export default UploadBatchDetailPage;
