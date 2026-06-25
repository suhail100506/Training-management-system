import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, RefreshCw } from 'lucide-react';
import * as masterApi from '../../api/master.api';
import { 
  TRAINING_TYPE_OPTIONS, 
  TRAINING_MODE_OPTIONS, 
  TRAINING_STATUS_OPTIONS,
  getFinancialYearOptions,
  getCurrentFinancialYear
} from '../../utils/constants';

const FilterPanel = ({ onApply, onReset }) => {
  // Master choices state
  const [groups, setGroups] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [types, setTypes] = useState(TRAINING_TYPE_OPTIONS);
  
  // Selected filter states
  const [financialYear, setFinancialYear] = useState(getCurrentFinancialYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [group, setGroup] = useState('');
  const [division, setDivision] = useState('');
  const [type, setType] = useState('');
  const [mode, setMode] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [gRes, dRes, tRes] = await Promise.all([
          masterApi.getMasterData('groupName'),
          masterApi.getMasterData('productDivision'),
          masterApi.getMasterData('typeOfTraining')
        ]);
        
        setGroups(gRes.data.data || []);
        setDivisions(dRes.data.data || []);
        if (tRes.data.data && tRes.data.data.length > 0) {
          setTypes(tRes.data.data.map(t => ({ value: t.value, label: t.value })));
        }
      } catch (err) {
        console.error('Failed to load master dropdown choices:', err);
      }
    };
    fetchDropdowns();
  }, []);

  const handleApply = () => {
    onApply({
      financialYear,
      startDate,
      endDate,
      group,
      division,
      type,
      mode,
      status,
      filterOperator: 'and'
    });
  };

  const handleReset = () => {
    setFinancialYear(getCurrentFinancialYear());
    setStartDate('');
    setEndDate('');
    setGroup('');
    setDivision('');
    setType('');
    setMode('');
    setStatus('');
    onReset();
  };

  const selectStyle = "w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl focus:outline-none dark:text-white h-9 text-xs font-semibold";

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850/50 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-350">
        <SlidersHorizontal className="w-4 h-4 text-brand-700" />
        <span>REPORT QUERY FILTERS</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-[11px] font-bold text-slate-600 dark:text-slate-400">
        
        {/* Financial Year Selector */}
        <div className="space-y-1">
          <label className="uppercase tracking-wider">Financial Year</label>
          <select
            value={financialYear}
            onChange={(e) => setFinancialYear(e.target.value)}
            className={selectStyle}
          >
            <option value="all">All</option>
            {getFinancialYearOptions().map(fy => (
              <option key={fy} value={fy}>{fy}</option>
            ))}
          </select>
        </div>

        {/* Starting Date */}
        <div className="space-y-1">
          <label className="uppercase tracking-wider">Starting Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={selectStyle}
          />
        </div>

        {/* Ending Date */}
        <div className="space-y-1">
          <label className="uppercase tracking-wider">Ending Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={selectStyle}
          />
        </div>

        {/* Group Name Selector */}
        <div className="space-y-1">
          <label className="uppercase tracking-wider">Groups</label>
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className={selectStyle}
          >
            <option value="">All</option>
            {groups.map(g => (
              <option key={g._id || g.value} value={g.value}>{g.value}</option>
            ))}
          </select>
        </div>

        {/* Product Division Selector */}
        <div className="space-y-1">
          <label className="uppercase tracking-wider">Product Divisions</label>
          <select
            value={division}
            onChange={(e) => setDivision(e.target.value)}
            className={selectStyle}
          >
            <option value="">All</option>
            {divisions.map(d => (
              <option key={d._id || d.value} value={d.value}>{d.value}</option>
            ))}
          </select>
        </div>

        {/* Training Type Selector */}
        <div className="space-y-1">
          <label className="uppercase tracking-wider">Training Types</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={selectStyle}
          >
            <option value="">All</option>
            {types.map(t => (
              <option key={t._id || t.value} value={t.value}>{t.label || t.value}</option>
            ))}
          </select>
        </div>

        {/* Training Mode Selector */}
        <div className="space-y-1">
          <label className="uppercase tracking-wider">Training Modes</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className={selectStyle}
          >
            <option value="">All</option>
            {TRAINING_MODE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Training Status Selector */}
        <div className="space-y-1">
          <label className="uppercase tracking-wider">Training Statuses</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={selectStyle}
          >
            <option value="">All</option>
            {TRAINING_STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Buttons */}
      <div className="pt-2 flex items-center justify-end space-x-3 text-xs">
        <button
          type="button"
          onClick={handleReset}
          className="text-slate-500 hover:text-slate-800 dark:hover:text-white font-bold"
        >
          Reset Filters
        </button>

        <button
          type="button"
          onClick={handleApply}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-850 dark:bg-brand-700 dark:hover:bg-brand-800 text-white font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Apply Filters</span>
        </button>
      </div>

    </div>
  );
};

export default FilterPanel;
