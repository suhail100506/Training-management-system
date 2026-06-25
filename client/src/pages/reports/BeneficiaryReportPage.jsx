import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as reportsApi from '../../api/reports.api';
import { formatCurrency } from '../../utils/formatters';
import PageTitle from '../../components/common/PageTitle';
import FilterPanel from '../../components/common/FilterPanel';
import DataTable from '../../components/common/DataTable';
import ExportButtons from '../../components/common/ExportButtons';
import { getCurrentFinancialYear } from '../../utils/constants';

const BeneficiaryReportPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ financialYear: getCurrentFinancialYear() });

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await reportsApi.getBeneficiaryReport(filters);
      setData(response.data.data);
    } catch (err) {
      console.error('Failed to fetch beneficiary report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [filters]);

  const columns = [
    { header: 'Module Number', key: 'moduleNumber' },
    { header: 'Training Topic', key: 'trainingTopic' },
    { header: 'Training Type', key: 'type' },
    { header: 'Beneficiaries Count', key: 'beneficiaryCount' },
    { header: 'Total Training Hours', key: 'totalHours' },
    {
      header: 'Total Cost',
      render: (row) => formatCurrency(row.totalCost)
    }
  ];

  // Slice the top 8 training topics for the visual chart
  const topTopicsChartData = data.slice(0, 8).map(d => ({
    topic: d.trainingTopic.length > 20 ? `${d.trainingTopic.slice(0, 18)}...` : d.trainingTopic,
    beneficiaries: d.beneficiaryCount
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageTitle title="Beneficiary Training Report" subtitle="Training topics ranked by total employee participation and completions" />
        <ExportButtons reportType="beneficiaries" filters={filters} />
      </div>

      <FilterPanel onApply={setFilters} onReset={() => setFilters({ financialYear: getCurrentFinancialYear() })} />

      {/* Top Topics Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850/50 rounded-2xl p-5 shadow-sm space-y-3">
        <h4 className="text-xs font-bold text-slate-850 dark:text-white uppercase tracking-wider">Top 8 Courses by Employee Attendance</h4>
        <div className="h-64 w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topTopicsChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f2f2f2" />
              <XAxis dataKey="topic" stroke="#94a3b8" fontSize={9} />
              <YAxis stroke="#94a3b8" fontSize={9} />
              <Tooltip />
              <Legend iconType="circle" />
              <Bar name="Completed Beneficiaries" dataKey="beneficiaries" fill="#1F4E79" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <DataTable columns={columns} data={data} loading={loading} />
    </div>
  );
};

export default BeneficiaryReportPage;
