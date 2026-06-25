import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import { getCurrentFinancialYear, getFinancialYearOptions } from '../../utils/constants';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  FileSpreadsheet, Users, Clock, IndianRupee, Award, Percent, 
  Download, Filter, SlidersHorizontal, Layers, CheckCircle
} from 'lucide-react';

import * as dashboardApi from '../../api/dashboard.api';
import * as masterApi from '../../api/master.api';
import { formatCurrency } from '../../utils/formatters';
import PageTitle from '../../components/common/PageTitle';

import 'react-toastify/dist/ReactToastify.css';

const COLORS = ['#1F4E79', '#4675a8', '#9ebad9', '#cbd9eb', '#f4f6fb'];
const STATUS_COLORS = {
  'Completed': '#10B981',      // Green
  'Not Completed': '#EF4444',  // Red
  'Cancelled': '#6B7280'       // Gray
};

const DashboardPage = () => {
  // Filters State
  const [selectedFY, setSelectedFY] = useState(getCurrentFinancialYear());
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');

  // Dropdown Caches
  const [groups, setGroups] = useState([]);
  const [divisions, setDivisions] = useState([]);
  
  // Dashboard Metrics State
  const [summary, setSummary] = useState(null);
  const [byMonth, setByMonth] = useState([]);
  const [byStatus, setByStatus] = useState([]);
  const [byType, setByType] = useState([]);
  const [byMode, setByMode] = useState([]);
  const [topTrainings, setTopTrainings] = useState([]);
  const [costByType, setCostByType] = useState([]);
  const [coverageGroup, setCoverageGroup] = useState([]);

  const [loading, setLoading] = useState(true);

  // Load dropdown lists on mount
  useEffect(() => {
    const fetchMasterOptions = async () => {
      try {
        const [gRes, dRes] = await Promise.all([
          masterApi.getMasterData('groupName'),
          masterApi.getMasterData('productDivision')
        ]);
        setGroups(gRes.data.data);
        setDivisions(dRes.data.data);
      } catch (err) {
        console.error('Failed to load filters:', err);
      }
    };
    fetchMasterOptions();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const params = {
      financialYear: selectedFY || undefined,
      group: selectedGroup || undefined,
      division: selectedDivision || undefined
    };

    try {
      const [
        sumRes,
        monthRes,
        statusRes,
        typeRes,
        modeRes,
        topRes,
        costRes,
        covGroupRes
      ] = await Promise.all([
        dashboardApi.getSummary(params),
        dashboardApi.getByMonth(params),
        dashboardApi.getByStatus(params),
        dashboardApi.getByType(params),
        dashboardApi.getByMode(params),
        dashboardApi.getTopTrainings(params),
        dashboardApi.getCostByType(params),
        dashboardApi.getCoverageByGroup(params)
      ]);

      setSummary(sumRes.data.data);
      setByMonth(monthRes.data.data);
      setByStatus(statusRes.data.data);
      setByType(typeRes.data.data);
      setByMode(modeRes.data.data);
      setTopTrainings(topRes.data.data);
      setCostByType(costRes.data.data);
      setCoverageGroup(covGroupRes.data.data);

    } catch (err) {
      console.error(err);
      toast.error('Failed to retrieve dashboard analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedFY, selectedGroup, selectedDivision]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageTitle title="Dashboard" subtitle="System KPI statistics, coverage metrics, and training costs" />
        
        {/* Quick Filter Panel */}
        <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md text-xs font-semibold print:border-none print:shadow-none print:bg-transparent hover:shadow-lg transition-all duration-300">
          <Filter className="w-3.5 h-3.5 text-slate-400 print:hidden" />
          
          {/* FY Filter */}
          <select
            value={selectedFY}
            onChange={(e) => setSelectedFY(e.target.value)}
            className="bg-transparent focus:outline-none dark:text-white print:hidden"
          >
            {getFinancialYearOptions().map(fy => (
              <option key={fy} value={fy}>{fy}</option>
            ))}
          </select>
          <span className="hidden print:inline dark:text-white font-bold">{selectedFY}</span>

          <span className="text-slate-300">|</span>

          {/* Group Filter */}
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="bg-transparent focus:outline-none max-w-[120px] dark:text-white print:hidden"
          >
            <option value="">Group: All</option>
            {groups.map(g => <option key={g._id} value={g.value}>{g.value}</option>)}
          </select>
          <span className="hidden print:inline dark:text-white font-bold">{selectedGroup ? `Group: ${selectedGroup}` : 'Group: All'}</span>

          <span className="text-slate-300">|</span>

          {/* Division Filter */}
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            className="bg-transparent focus:outline-none max-w-[120px] dark:text-white print:hidden"
          >
            <option value="">Division: All</option>
            {divisions.map(d => <option key={d._id} value={d.value}>{d.value}</option>)}
          </select>
          <span className="hidden print:inline dark:text-white font-bold">{selectedDivision ? `Division: ${selectedDivision}` : 'Division: All'}</span>
        </div>
      </div>

      {/* KPI Cards section */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        
        {/* Total records */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <FileSpreadsheet className="w-4 h-4 text-brand-700 dark:text-brand-400" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Records</span>
          </div>
          <p className="text-xl font-extrabold text-slate-905 dark:text-white">{loading ? '...' : summary?.totalRecords}</p>
          <p className="text-[9px] text-slate-500 font-medium">Total course logs</p>
        </div>

        {/* Unique trained */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <Users className="w-4 h-4 text-brand-700 dark:text-brand-400" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Trained</span>
          </div>
          <p className="text-xl font-extrabold text-slate-905 dark:text-white">{loading ? '...' : summary?.uniqueStaffTrained}</p>
          <p className="text-[9px] text-slate-500 font-medium">Unique staff trained</p>
        </div>

        {/* Hours */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <Clock className="w-4 h-4 text-brand-700 dark:text-brand-400" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Hours</span>
          </div>
          <p className="text-xl font-extrabold text-slate-905 dark:text-white">{loading ? '...' : summary?.totalTrainingHours}</p>
          <p className="text-[9px] text-slate-500 font-medium">Trained duration hours</p>
        </div>

        {/* Cost */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <IndianRupee className="w-4 h-4 text-brand-700 dark:text-brand-400" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Cost</span>
          </div>
          <p className="text-lg font-extrabold text-slate-905 dark:text-white truncate">{loading ? '...' : formatCurrency(summary?.totalTrainingCost)}</p>
          <p className="text-[9px] text-slate-500 font-medium">Total financial budget</p>
        </div>

        {/* Coverage */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <Percent className="w-4 h-4 text-brand-700 dark:text-brand-400" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Coverage</span>
          </div>
          <p className="text-xl font-extrabold text-slate-905 dark:text-white">{loading ? '...' : `${summary?.trainingCoveragePercent}%`}</p>
          <p className="text-[9px] text-slate-500 font-medium">Trained / Active staff</p>
        </div>

        {/* Beneficiaries */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <CheckCircle className="w-4 h-4 text-brand-700 dark:text-brand-400" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Completed</span>
          </div>
          <p className="text-xl font-extrabold text-slate-905 dark:text-white">{loading ? '...' : summary?.totalBeneficiaries}</p>
          <p className="text-[9px] text-slate-500 font-medium">Beneficiaries count</p>
        </div>

      </div>

      {/* Grid containing Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Chart 1: Monthly Count & Hours */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Monthly Trainings Trend</h4>
            <span className="text-[10px] text-slate-400 italic">Financial Year Comparison</span>
          </div>
          <div className="h-72 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byMonth} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip />
                <Legend iconType="circle" />
                <Bar name="Trainings Count" dataKey="count" fill="#1F4E79" radius={[4, 4, 0, 0]} />
                <Bar name="Duration (Hours)" dataKey="hours" fill="#9ebad9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Status distribution (Completed / Not Completed / Cancelled) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 space-y-3">
          <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Training Status Breakdown</h4>
          <div className="h-72 w-full text-xs relative flex items-center justify-center">
            {byStatus.length === 0 ? (
              <p className="text-slate-400 italic text-center">No data logged</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {byStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" layout="vertical" align="right" verticalAlign="middle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 3: Cost by training type */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 space-y-3">
          <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Cost by Training Type</h4>
          <div className="h-72 w-full text-xs">
            {costByType.length === 0 ? (
              <p className="text-slate-400 italic text-center py-20">No cost data logged</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costByType} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={9} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} width={60} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar name="Total Cost" dataKey="cost" fill="#4675a8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 4: Group Coverage */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 space-y-3">
          <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Training Coverage % by Group</h4>
          <div className="h-72 w-full text-xs">
            {coverageGroup.length === 0 ? (
              <p className="text-slate-400 italic text-center py-20">No group data logged</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={coverageGroup} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="groupName" stroke="#94a3b8" fontSize={9} />
                  <YAxis unit="%" stroke="#94a3b8" fontSize={9} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar name="Coverage Percentage" dataKey="coveragePercent" fill="#1F4E79" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 5: Top topics */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 space-y-4">
          <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Top Training Topics</h4>
          
          <div className="space-y-3.5">
            {topTrainings.slice(0, 5).map((topic, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{topic.topic}</span>
                  <span className="font-bold text-brand-700 dark:text-brand-400">{topic.attendance} attending</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-brand-700 h-full rounded-full"
                    style={{ 
                      width: `${topTrainings[0]?.attendance > 0 ? (topic.attendance / topTrainings[0].attendance) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            ))}
            {topTrainings.length === 0 && (
              <p className="text-slate-400 italic text-center py-10">No topic data logged</p>
            )}
          </div>
        </div>

      </div>

      <ToastContainer position="top-right" autoClose={5000} />
    </div>
  );
};

export default DashboardPage;
