import React, { useState, useEffect } from 'react';
import { Eye, X } from 'lucide-react';
import * as reportsApi from '../../api/reports.api';
import * as trainingApi from '../../api/training.api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import PageTitle from '../../components/common/PageTitle';
import FilterPanel from '../../components/common/FilterPanel';
import DataTable from '../../components/common/DataTable';
import ExportButtons from '../../components/common/ExportButtons';
import StatusBadge from '../../components/common/StatusBadge';
import { getCurrentFinancialYear } from '../../utils/constants';

const StaffWiseReportPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ financialYear: getCurrentFinancialYear() });

  // Drilldown Modal State
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffRecords, setStaffRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await reportsApi.getStaffWiseReport(filters);
      setData(response.data.data);
    } catch (err) {
      console.error('Failed to fetch staff-wise report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [filters]);

  const handleViewDetails = async (staff) => {
    setSelectedStaff(staff);
    setRecordsLoading(true);
    try {
      // Fetch records for this staff member
      // Note: We also pass financialYear filter to see relevant records in that period if needed, 
      // or we retrieve all/filtered by the active report filter settings.
      const response = await trainingApi.getTrainingRecords({
        staffNumber: staff.staffNumber,
        financialYear: filters.financialYear,
        type: filters.type,
        mode: filters.mode,
        status: filters.status,
        limit: 100 // return up to 100 records for the staff member
      });
      setStaffRecords(response.data.data);
    } catch (err) {
      console.error('Failed to fetch individual staff records:', err);
    } finally {
      setRecordsLoading(false);
    }
  };

  const columns = [
    { header: 'Staff Number', key: 'staffNumber' },
    { header: 'Employee Name', key: 'staffName' },
    { header: 'Designation', key: 'designation' },
    { header: 'Group Name', key: 'groupName' },
    { header: 'Total Courses Logged', key: 'totalTrainings' },
    { header: 'Total Hours Spent', key: 'totalHours' },
    {
      header: 'Total Cost',
      render: (row) => formatCurrency(row.totalCost)
    },
    {
      header: 'Status Breakdown',
      render: (row) => (
        <span className="text-[10px] font-mono text-slate-500">
          Comp: {row.statusBreakdown?.Completed || 0} | Inc: {row.statusBreakdown?.NotCompleted || 0} | Can: {row.statusBreakdown?.Cancelled || 0}
        </span>
      )
    },
    {
      header: 'Actions',
      render: (row) => (
        <button
          type="button"
          onClick={() => handleViewDetails(row)}
          className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>View Details</span>
        </button>
      )
    }
  ];

  const modalColumns = [
    { header: 'Module Number', key: 'trainingModuleNumber' },
    { header: 'Topic', key: 'trainingTopic' },
    {
      header: 'Training Duration',
      render: (row) => `${row.trainingDurationHours} Hrs`
    },
    {
      header: 'Start Date',
      render: (row) => formatDate(row.startDateOfTraining)
    },
    {
      header: 'End Date',
      render: (row) => formatDate(row.endDateOfTraining)
    },
    {
      header: 'Processed Date',
      render: (row) => formatDate(row.requestProcessedDate)
    },
    {
      header: 'Cost',
      render: (row) => formatCurrency(row.trainingCostPerPerson)
    },
    {
      header: 'Status',
      render: (row) => <StatusBadge status={row.trainingStatus} />
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageTitle title="Staff-Wise Training Report" subtitle="Analyze training history details and hours logged per employee" />
        <ExportButtons reportType="staff-wise" filters={filters} />
      </div>

      <FilterPanel onApply={setFilters} onReset={() => setFilters({ financialYear: getCurrentFinancialYear() })} />

      <DataTable columns={columns} data={data} loading={loading} />

      {/* Drilldown Modal */}
      {selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-5xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                  Training History for {selectedStaff.staffName} ({selectedStaff.staffNumber})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedStaff.designation} &bull; {selectedStaff.groupName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStaff(null)}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Table */}
            <div className="p-6 overflow-y-auto flex-1">
              <DataTable columns={modalColumns} data={staffRecords} loading={recordsLoading} />
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-850 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedStaff(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-850 dark:bg-brand-700 dark:hover:bg-brand-800 text-white text-xs font-bold rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffWiseReportPage;
