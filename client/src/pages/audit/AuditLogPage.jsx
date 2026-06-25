import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import { Eye, Search, SlidersHorizontal, RefreshCw, Calendar, History } from 'lucide-react';
import DatePicker from 'react-datepicker';

import * as auditApi from '../../api/audit.api';
import { usePagination } from '../../hooks/usePagination';
import PageTitle from '../../components/common/PageTitle';
import DataTable from '../../components/common/DataTable';
import useAuth from '../../hooks/useAuth';

import 'react-datepicker/dist/react-datepicker.css';
import 'react-toastify/dist/ReactToastify.css';

const AuditLogPage = () => {
  const { user } = useAuth();
  const { page, limit, total, totalPages, setTotal, setTotalPages, handlePageChange, handleLimitChange } = usePagination(25);
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filters State
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // View Details Modal States
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const actionOptions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'BULK_UPLOAD'];
  const moduleOptions = ['Auth', 'User', 'Staff', 'TrainingRecord', 'UploadBatch', 'MasterData'];

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        action: selectedAction || undefined,
        module: selectedModule || undefined,
        userId: userIdFilter || undefined,
        startDate: startDate ? startDate.toISOString() : undefined,
        endDate: endDate ? endDate.toISOString() : undefined
      };

      const response = await auditApi.getAuditLogs(params);
      const { data, pagination } = response.data;
      setLogs(data);
      setTotal(pagination.total);
      setTotalPages(pagination.totalPages);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, limit, selectedAction, selectedModule, startDate, endDate]);

  const handleOpenDetails = (log) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const handleResetFilters = () => {
    setSelectedAction('');
    setSelectedModule('');
    setUserIdFilter('');
    setStartDate(null);
    setEndDate(null);
    toast.info('Filters reset');
  };

  const columns = [
    {
      header: 'Timestamp',
      render: (row) => new Date(row.timestamp).toLocaleString('en-IN')
    },
    {
      header: 'Operator',
      render: (row) => (
        <div>
          <p className="font-bold text-slate-800 dark:text-slate-200">{row.userEmail || 'System'}</p>
          <p className="text-[9px] text-slate-400">ID: {row.userId || '—'}</p>
        </div>
      )
    },
    {
      header: 'Action',
      render: (row) => {
        let actionColor = 'bg-slate-100 text-slate-700 dark:bg-slate-850 dark:text-slate-400';
        if (row.action === 'CREATE') actionColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450';
        if (row.action === 'DELETE') actionColor = 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-450';
        if (row.action === 'UPDATE') actionColor = 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-450';
        if (row.action === 'LOGIN') actionColor = 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-450';
        if (row.action === 'BULK_UPLOAD') actionColor = 'bg-violet-50 text-violet-700 dark:bg-violet-950/20 dark:text-violet-450';

        return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border border-transparent capitalize ${actionColor}`}>
            {row.action.replace('_', ' ')}
          </span>
        );
      }
    },
    { header: 'Module', key: 'module' },
    {
      header: 'Affected Record ID',
      render: (row) => (
        <span className="font-mono text-[10px] text-slate-500">
          {row.recordId ? row.recordId : '—'}
        </span>
      )
    },
    { header: 'IP Address', key: 'ipAddress' },
    {
      header: 'Actions',
      render: (row) => (
        <button
          onClick={() => handleOpenDetails(row)}
          className="p-1 text-brand-700 hover:text-brand-800 dark:text-brand-450 dark:hover:text-brand-350 font-bold flex items-center space-x-1"
          title="Compare JSON differences"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="text-[10px]">Compare</span>
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageTitle title="System Audit Logs" subtitle="Review write actions, credential changes, and data modifications" />
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center space-x-1.5 px-3.5 py-2 border rounded-xl text-xs font-semibold shadow-sm transition-all ${
            showFilters 
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-850 dark:text-white border-slate-300' 
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filters</span>
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm space-y-4 animate-in slide-in-from-top-2 duration-150">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
            {/* Action */}
            <div>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-350"
              >
                <option value="">Action: All</option>
                {actionOptions.map(act => <option key={act} value={act}>{act}</option>)}
              </select>
            </div>

            {/* Module */}
            <div>
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-350"
              >
                <option value="">Module: All</option>
                {moduleOptions.map(mod => <option key={mod} value={mod}>{mod}</option>)}
              </select>
            </div>

            {/* User ID (For Super Admin) */}
            {user?.role === 'super_admin' && (
              <div>
                <input
                  type="text"
                  placeholder="Operator User UUID"
                  value={userIdFilter}
                  onChange={(e) => setUserIdFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-white"
                />
              </div>
            )}

            {/* Start Date */}
            <div>
              <DatePicker
                placeholderText="Start Date"
                selected={startDate}
                onChange={(val) => setStartDate(val)}
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-white"
              />
            </div>

            {/* End Date */}
            <div>
              <DatePicker
                placeholderText="End Date"
                selected={endDate}
                onChange={(val) => setEndDate(val)}
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-bold text-slate-500 hover:text-slate-850 dark:hover:text-white"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paginated logs listing */}
      <DataTable
        columns={columns}
        data={logs}
        loading={loading}
        pagination={{
          page,
          limit,
          total,
          totalPages,
          handlePageChange,
          handleLimitChange
        }}
      />

      {/* JSON side by side diff details modal */}
      {detailsOpen && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-brand-700 dark:text-brand-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Compare Diff snapshot - {selectedLog.action} on {selectedLog.module}
                </h3>
              </div>
              <button
                onClick={() => setDetailsOpen(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
              >
                Close
              </button>
            </div>

            {/* Content segment */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 text-[10px] flex-1">
              {/* Before Snapshot */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[9px] flex items-center justify-between">
                  <span>Before Modifications</span>
                  <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400">State old</span>
                </h4>
                <pre className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl overflow-x-auto max-h-96 font-mono text-slate-700 dark:text-slate-350">
                  {selectedLog.before 
                    ? JSON.stringify(selectedLog.before, null, 2) 
                    : '// No prior state (Create action)'}
                </pre>
              </div>

              {/* After Snapshot */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[9px] flex items-center justify-between">
                  <span>After Modifications</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450">State new</span>
                </h4>
                <pre className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl overflow-x-auto max-h-96 font-mono text-slate-700 dark:text-slate-350">
                  {selectedLog.after 
                    ? JSON.stringify(selectedLog.after, null, 2) 
                    : '// No final state (Delete action)'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={5000} />
    </div>
  );
};

export default AuditLogPage;
