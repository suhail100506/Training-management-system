import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as reportsApi from '../../api/reports.api';
import * as trainingApi from '../../api/training.api';
import { usePagination } from '../../hooks/usePagination';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { getCurrentFinancialYear } from '../../utils/constants';
import PageTitle from '../../components/common/PageTitle';
import FilterPanel from '../../components/common/FilterPanel';
import DataTable from '../../components/common/DataTable';
import ExportButtons from '../../components/common/ExportButtons';
import StatusBadge from '../../components/common/StatusBadge';
import { ShieldCheck, ToggleLeft, ToggleRight, Layers, Table, UserCheck, Building2 } from 'lucide-react';

const AllInReportPage = () => {
  const [coverageOnly, setCoverageOnly] = useState(false);
  const [filters, setFilters] = useState({ financialYear: getCurrentFinancialYear() });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination hook for Raw Records Mode
  const { 
    page, 
    limit, 
    total, 
    totalPages, 
    setTotal, 
    setTotalPages, 
    handlePageChange, 
    handleLimitChange 
  } = usePagination(25);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      if (coverageOnly) {
        // Fetch Department-Wise (Group-Wise) aggregated stats
        const response = await reportsApi.getDepartmentWiseReport(filters);
        const fetchedData = response.data.data || [];
        
        // Sort alphabetically to match the screenshot order
        fetchedData.sort((a, b) => {
          const nameA = (a.groupName || '').toUpperCase();
          const nameB = (b.groupName || '').toUpperCase();
          return nameA.localeCompare(nameB);
        });

        // Add S.NO dynamically for UI table rendering
        const formatted = fetchedData.map((item, index) => ({
          ...item,
          sNo: index + 1
        }));
        setData(formatted);
      } else {
        // Fetch Raw Training Records (paginated)
        const params = {
          page,
          limit,
          financialYear: filters.financialYear || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          group: filters.group || undefined,
          division: filters.division || undefined,
          type: filters.type || undefined,
          mode: filters.mode || undefined,
          status: filters.status || undefined,
          filterOperator: 'and'
        };
        const response = await trainingApi.getTrainingRecords(params);
        const { data: recordsList, pagination } = response.data;
        setData(recordsList || []);
        setTotal(pagination.total || 0);
        setTotalPages(pagination.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load report data:', err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [coverageOnly, filters, page, limit]);

  // Handle filter applications
  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({ financialYear: getCurrentFinancialYear() });
  };

  // Calculate breakdowns for trainer and group hours
  const getGroupBreakdown = () => {
    const breakdown = {};
    data.forEach(r => {
      const gName = r.groupName || 'Unknown';
      const hours = Number(r.trainingDurationHours) || 0;
      breakdown[gName] = (breakdown[gName] || 0) + hours;
    });
    return Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  };

  const getTrainerBreakdown = () => {
    const breakdown = {};
    data.forEach(r => {
      const tName = r.trainerName || 'Unknown';
      const hours = Number(r.trainingDurationHours) || 0;
      breakdown[tName] = (breakdown[tName] || 0) + hours;
    });
    return Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  };

  // Define Columns for Group-Wise Coverage Mode
  const coverageColumns = [
    {
      header: 'S.NO',
      key: 'sNo'
    },
    {
      header: 'Group Name',
      key: 'groupName'
    },
    {
      header: 'No of Trainees',
      key: 'staffTrained'
    },
    {
      header: 'GROUP STRENGTH',
      key: 'totalStaff'
    },
    {
      header: '% COVERAGE FOR THE GROUP',
      render: (row) => row.totalStaff > 0 ? ((row.staffTrained / row.totalStaff) * 100).toFixed(2) : '0.00'
    },
    {
      header: 'Time Spend on Group',
      render: (row) => `${row.totalHours || 0} hrs`
    }
  ];

  // Define Columns for Raw Records Mode
  const rawColumns = [
    {
      header: '#',
      render: (row, idx) => (page - 1) * limit + idx + 1
    },
    {
      header: 'Staff Info',
      render: (row) => (
        <div className="block">
          <p className="font-bold text-slate-900 dark:text-white">{row.staffNumber}</p>
          <p className="text-[10px] text-slate-500">{row.staffName}</p>
        </div>
      )
    },
    { header: 'Group Name', key: 'groupName' },
    { header: 'Training Topic', key: 'trainingTopic' },
    { header: 'Trainer Name', key: 'trainerName' },
    { header: 'Module #', key: 'trainingModuleNumber' },
    { header: 'Training Type', key: 'typeOfTraining' },
    { header: 'Mode', key: 'trainingMode' },
    {
      header: 'Time Spend by Staff',
      render: (row) => `${row.trainingDurationHours} hrs`
    },
    {
      header: 'Dates',
      render: (row) => (
        <div>
          <p>{formatDate(row.startDateOfTraining)}</p>
          <p className="text-[9px] text-slate-400">to {formatDate(row.endDateOfTraining)}</p>
        </div>
      )
    },
    {
      header: 'Processed Date',
      render: (row) => formatDate(row.requestProcessedDate)
    },
    {
      header: 'Status',
      render: (row) => <StatusBadge status={row.trainingStatus} />
    },
    {
      header: 'Payment Date',
      render: (row) => formatDate(row.paymentDate) || '—'
    },
    {
      header: 'Cost',
      render: (row) => formatCurrency(row.trainingCostPerPerson)
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageTitle 
          title="All-in-One Training Report" 
          subtitle="Apply filters on all attributes and toggle coverage-only fields for group wise analysis exports" 
        />
        <ExportButtons 
          reportType="all" 
          filters={{ ...filters, coverageOnly }} 
        />
      </div>

      {/* Coverage Mode Switcher Card */}
      <div className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 shadow-sm flex items-center justify-between transition-all duration-200">
        <div className="space-y-1.5 pr-4">
          <div className="flex items-center space-x-2">
            {coverageOnly ? (
              <Layers className="w-5 h-5 text-brand-700 dark:text-brand-400" />
            ) : (
              <Table className="w-5 h-5 text-slate-500" />
            )}
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              {coverageOnly ? "Coverage Mode Active" : "Coverage Mode Inactive"}
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCoverageOnly(!coverageOnly)}
          className="focus:outline-none transition-transform active:scale-95 duration-100"
          title="Toggle coverage export formatting option"
        >
          {coverageOnly ? (
            <ToggleRight className="w-12 h-12 text-brand-700 dark:text-brand-400" />
          ) : (
            <ToggleLeft className="w-12 h-12 text-slate-400 dark:text-slate-650" />
          )}
        </button>
      </div>

      {/* Filter Panel */}
      <FilterPanel 
        onApply={handleApplyFilters} 
        onReset={handleResetFilters} 
      />

      {/* Time Spent breakdowns (only in raw mode since coverage mode has exactly 5 fields) */}
      {!coverageOnly && data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Trainer Time Spent */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850/50 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <UserCheck className="w-4 h-4 text-brand-700 dark:text-brand-400" />
              <h4 className="text-xs font-bold text-slate-850 dark:text-white uppercase tracking-wider">
                Time Spent on Trainer
              </h4>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {getTrainerBreakdown().map(([trainer, hours]) => (
                <div key={trainer} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[200px]" title={trainer}>
                    {trainer}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-400 rounded-full border border-brand-100 dark:border-brand-900/50">
                    {hours} hrs
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Group Time Spent */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850/50 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Building2 className="w-4 h-4 text-brand-700 dark:text-brand-400" />
              <h4 className="text-xs font-bold text-slate-850 dark:text-white uppercase tracking-wider">
                Time Spent on Group
              </h4>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {getGroupBreakdown().map(([group, hours]) => (
                <div key={group} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[200px]" title={group}>
                    {group}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-400 rounded-full border border-brand-100 dark:border-brand-900/50">
                    {hours} hrs
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Report Data Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {coverageOnly ? "Groupwise Training details list" : "Detailed training logs list"}
          </h4>
        </div>
        
        <DataTable 
          columns={coverageOnly ? coverageColumns : rawColumns} 
          data={data} 
          loading={loading}
          pagination={coverageOnly ? null : {
            page,
            limit,
            total,
            totalPages,
            handlePageChange,
            handleLimitChange
          }}
        />
      </div>
    </div>
  );
};

export default AllInReportPage;
