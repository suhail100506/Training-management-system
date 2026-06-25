import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as reportsApi from '../../api/reports.api';
import { formatCurrency } from '../../utils/formatters';
import PageTitle from '../../components/common/PageTitle';
import FilterPanel from '../../components/common/FilterPanel';
import DataTable from '../../components/common/DataTable';
import ExportButtons from '../../components/common/ExportButtons';
import { getCurrentFinancialYear } from '../../utils/constants';

const DepartmentWiseReportPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ financialYear: getCurrentFinancialYear() });

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await reportsApi.getDepartmentWiseReport(filters);
      setData(response.data.data);
    } catch (err) {
      console.error('Failed to fetch department-wise report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [filters]);

  const columns = [
    { header: 'Group Name', key: 'groupName' },
    { header: 'Total Active Staff', key: 'totalStaff' },
    { header: 'Staff Trained', key: 'staffTrained' },
    {
      header: 'Coverage %',
      render: (row) => `${row.coveragePercent}%`
    },
    { header: 'Total Hours logged', key: 'totalHours' },
    {
      header: 'Total Cost',
      render: (row) => formatCurrency(row.totalCost)
    },
    {
      header: 'Training Type Breakdown',
      render: (row) => (
        <span className="text-[10px] text-slate-500 font-mono">
          OT: {row.byType?.OT || 0} | Ext: {row.byType?.External || 0} | Grp: {row.byType?.Group || 0} | Oth: {row.byType?.Others || 0}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageTitle title="Group-Wise Training Report" subtitle="Department and group-level coverage analysis and cost summaries" />
        <ExportButtons reportType="department-wise" filters={filters} />
      </div>

      <FilterPanel onApply={setFilters} onReset={() => setFilters({ financialYear: getCurrentFinancialYear() })} />

      {/* Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850/50 rounded-2xl p-5 shadow-sm space-y-3">
        <h4 className="text-xs font-bold text-slate-850 dark:text-white uppercase tracking-wider">Group Coverage & Cost</h4>
        <div className="h-64 w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f2f2f2" />
              <XAxis type="number" stroke="#94a3b8" fontSize={9} />
              <YAxis dataKey="groupName" type="category" stroke="#94a3b8" fontSize={9} width={80} />
              <Tooltip />
              <Legend iconType="circle" />
              <Bar name="Coverage %" dataKey="coveragePercent" fill="#1F4E79" radius={[0, 4, 4, 0]} />
              <Bar name="Staff Trained" dataKey="staffTrained" fill="#7ba0c7" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <DataTable columns={columns} data={data} loading={loading} />
    </div>
  );
};

export default DepartmentWiseReportPage;
