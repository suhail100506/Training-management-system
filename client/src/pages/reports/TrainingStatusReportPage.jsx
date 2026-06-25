import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as reportsApi from '../../api/reports.api';
import { formatCurrency } from '../../utils/formatters';
import PageTitle from '../../components/common/PageTitle';
import FilterPanel from '../../components/common/FilterPanel';
import DataTable from '../../components/common/DataTable';
import ExportButtons from '../../components/common/ExportButtons';
import { getCurrentFinancialYear } from '../../utils/constants';

// Elegant colors representing states: Completed (Greenish-Blue), Not Completed (Amber/Orange), Cancelled (Slate/Red)
const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

const TrainingStatusReportPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ financialYear: getCurrentFinancialYear() });

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await reportsApi.getTrainingStatusReport(filters);
      setData(response.data.data);
    } catch (err) {
      console.error('Failed to fetch training status report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [filters]);

  const columns = [
    { header: 'Training Status', key: 'status' },
    { header: 'Records Count', key: 'count' },
    {
      header: '% of Total',
      render: (row) => `${row.percentOfTotal}%`
    },
    { header: 'Training Hours', key: 'trainingHours' },
    {
      header: 'Total Cost',
      render: (row) => formatCurrency(row.cost)
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageTitle title="Training Status Report" subtitle="Analyze distribution of training records (Completed, Pending, Cancelled)" />
        <ExportButtons reportType="training-status" filters={filters} />
      </div>

      <FilterPanel onApply={setFilters} onReset={() => setFilters({ financialYear: getCurrentFinancialYear() })} />

      {/* Recharts Pie Chart container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850/50 rounded-2xl p-5 shadow-sm space-y-3">
        <h4 className="text-xs font-bold text-slate-850 dark:text-white uppercase tracking-wider">Status Distribution</h4>
        <div className="h-64 w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="count"
                nameKey="status"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} Records`} />
              <Legend iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <DataTable columns={columns} data={data} loading={loading} />
    </div>
  );
};

export default TrainingStatusReportPage;
