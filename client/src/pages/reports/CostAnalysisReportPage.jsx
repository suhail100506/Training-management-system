import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as reportsApi from '../../api/reports.api';
import { formatCurrency } from '../../utils/formatters';
import PageTitle from '../../components/common/PageTitle';
import FilterPanel from '../../components/common/FilterPanel';
import DataTable from '../../components/common/DataTable';
import ExportButtons from '../../components/common/ExportButtons';
import { getCurrentFinancialYear } from '../../utils/constants';

const COLORS = ['#1F4E79', '#4675a8', '#7ba0c7', '#a9c5e3'];

const CostAnalysisReportPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ financialYear: getCurrentFinancialYear() });

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await reportsApi.getCostAnalysisReport(filters);
      setData(response.data.data);
    } catch (err) {
      console.error('Failed to fetch cost analysis report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [filters]);

  const columns = [
    { header: 'Training Type', key: 'trainingType' },
    { header: 'Total Courses Logged', key: 'totalTrainings' },
    { header: 'Beneficiaries Count', key: 'beneficiaries' },
    {
      header: 'Total Cost',
      render: (row) => formatCurrency(row.totalCost)
    },
    {
      header: 'Average Cost Per Employee',
      render: (row) => formatCurrency(row.avgCostPerPerson)
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageTitle title="Cost Analysis Report" subtitle="Financial breakdown, total costs, and average costs of training modules" />
        <ExportButtons reportType="cost-analysis" filters={filters} />
      </div>

      <FilterPanel onApply={setFilters} onReset={() => setFilters({ financialYear: getCurrentFinancialYear() })} />

      {/* Cost Pie Chart & Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850/50 rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[300px]">
          <h4 className="text-xs font-bold text-slate-850 dark:text-white uppercase tracking-wider mb-2">Cost Distribution by Training Type</h4>
          <div className="h-60 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="totalCost"
                  nameKey="trainingType"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850/50 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-center">
          <h4 className="text-xs font-bold text-slate-850 dark:text-white uppercase tracking-wider">Financial Overview</h4>
          <div className="space-y-3">
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850">
              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide">Total Expenditure</span>
              <p className="text-lg font-bold text-slate-850 dark:text-white mt-0.5">
                {formatCurrency(data.reduce((acc, curr) => acc + curr.totalCost, 0))}
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850">
              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide">Total Beneficiaries</span>
              <p className="text-lg font-bold text-slate-850 dark:text-white mt-0.5">
                {data.reduce((acc, curr) => acc + curr.beneficiaries, 0)} Employees
              </p>
            </div>
          </div>
        </div>
      </div>

      <DataTable columns={columns} data={data} loading={loading} />
    </div>
  );
};

export default CostAnalysisReportPage;
