import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as reportsApi from '../../api/reports.api';
import { formatCurrency } from '../../utils/formatters';
import PageTitle from '../../components/common/PageTitle';
import FilterPanel from '../../components/common/FilterPanel';
import DataTable from '../../components/common/DataTable';
import ExportButtons from '../../components/common/ExportButtons';
import { getCurrentFinancialYear } from '../../utils/constants';

const MonthlyReportPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ financialYear: getCurrentFinancialYear() });

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await reportsApi.getMonthlyReport(filters);
      setData(response.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [filters]);

  const columns = [
    { header: 'Month Name', key: 'month' },
    { header: 'Total Courses Logged', key: 'totalTrainings' },
    { header: 'Unique Employees Trained', key: 'uniqueStaff' },
    { header: 'Total Training Hours', key: 'trainingHours' },
    {
      header: 'Coverage %',
      render: (row) => `${row.coveragePercent}%`
    },
    {
      header: 'Total Cost',
      render: (row) => formatCurrency(row.totalCost)
    },
    {
      header: 'Training Type Breakdown',
      render: (row) => (
        <span className="text-[10px] text-slate-500 font-mono">
          OT: {row.byType.OT} | Ext: {row.byType.External} | Grp: {row.byType.Group} | Oth: {row.byType.Others}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageTitle title="Monthly Training Report" subtitle="Month-by-month training records coverage and cost comparisons" />
        <ExportButtons reportType="monthly" filters={filters} />
      </div>

      <FilterPanel onApply={setFilters} onReset={() => setFilters({ financialYear: getCurrentFinancialYear() })} />

      {/* Recharts comparison bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850/50 rounded-2xl p-5 shadow-sm space-y-3">
        <h4 className="text-xs font-bold text-slate-850 dark:text-white uppercase tracking-wider">Monthly Trainings Chart</h4>
        <div className="h-64 w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f2f2f2" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={9} />
              <YAxis stroke="#94a3b8" fontSize={9} />
              <Tooltip />
              <Legend iconType="circle" />
              <Bar name="Total Courses" dataKey="totalTrainings" fill="#1F4E79" radius={[4, 4, 0, 0]} />
              <Bar name="Trained Hours" dataKey="trainingHours" fill="#9ebad9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <DataTable columns={columns} data={data} loading={loading} />
    </div>
  );
};

export default MonthlyReportPage;
