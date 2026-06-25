import React, { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { isSuperAdmin } from '../../utils/roleHelpers';
import cdotLogo from '../../assets/CDOT_logo.gif';
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  Users, 
  ShieldCheck, 
  TrendingUp, 
  Database, 
  History, 
  Settings, 
  ChevronDown, 
  ChevronRight,
  BookOpen,
  CalendarDays,
  FileBarChart,
  UserCheck,
  Building2,
  IndianRupee,
  Info,
  Layers,
  GraduationCap,
  Lock
} from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user } = useAuth();
  const [reportsOpen, setReportsOpen] = useState(false);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [systemName, setSystemName] = useState(() => localStorage.getItem('tms_systemName') || 'CDOT TMS');

  useEffect(() => {
    const handleSettingsChange = () => {
      setSystemName(localStorage.getItem('tms_systemName') || 'CDOT TMS');
    };
    window.addEventListener('tms_settings_changed', handleSettingsChange);
    return () => {
      window.removeEventListener('tms_settings_changed', handleSettingsChange);
    };
  }, []);

  const superAdminOnly = isSuperAdmin(user);

  const isLinkDisabled = (to) => {
    if (!user?.mustChangePassword) return false;
    return to !== '/change-password';
  };

  const navClass = (to) => ({ isActive }) => {
    const disabled = isLinkDisabled(to);
    return `flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
      disabled
        ? 'opacity-40 cursor-not-allowed pointer-events-none'
        : isActive 
          ? 'bg-brand-700 text-white shadow-sm' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
    }`;
  };

  const subNavClass = (to) => ({ isActive }) => {
    const disabled = isLinkDisabled(to);
    return `flex items-center space-x-3 pl-12 pr-4 py-2 rounded-lg transition-all duration-200 text-xs font-medium ${
      disabled
        ? 'opacity-40 cursor-not-allowed pointer-events-none'
        : isActive 
          ? 'text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/45 font-semibold' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-850 dark:hover:text-white'
    }`;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200/60 dark:border-slate-800/60 flex flex-col justify-between transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Segment: Brand & User Avatar */}
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand Logo */}
          <div className="h-16 flex items-center px-5 border-b border-slate-200/50 dark:border-slate-800/50 bg-brand-700">
            <Link to="/dashboard" className="flex items-center space-x-2.5">
              <img src={cdotLogo} alt="CDOT Logo" className="w-8 h-8 object-contain bg-white rounded-lg p-0.5" />
              <span 
                className="font-bold text-white tracking-wide text-lg truncate max-w-[170px] inline-block"
                title={systemName}
              >
                {systemName}
              </span>
            </Link>
          </div>

          {/* User Profile Card */}
          <div className="p-4 mx-4 my-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/40 dark:border-slate-800/40 rounded-2xl flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-brand-700 text-white flex items-center justify-center font-bold text-sm shadow-sm uppercase">
              {user?.name ? user.name.slice(0, 2) : 'SA'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{user?.name || 'Super Admin'}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email || 'admin@kmg.com'}</p>
              <span className="inline-block mt-1 px-2 py-0.5 text-[8.5px] font-bold tracking-wider uppercase rounded-full bg-brand-50 text-brand-700 border border-brand-100 dark:bg-brand-950/50 dark:text-brand-400 dark:border-brand-900/50">
                {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 space-y-1.5 pb-6">
            <NavLink to="/dashboard" className={navClass('/dashboard')} onClick={() => toggleSidebar(false)}>
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </NavLink>

            {/* Collapsible: Training Records */}
            <div>
              <button 
                onClick={() => !user?.mustChangePassword && setRecordsOpen(!recordsOpen)}
                disabled={user?.mustChangePassword}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  user?.mustChangePassword
                    ? 'opacity-40 cursor-not-allowed pointer-events-none text-slate-400'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Training Records</span>
                </div>
                {recordsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {recordsOpen && (
                <div className="mt-1 space-y-1">
                  <NavLink to="/training" className={subNavClass('/training')} end onClick={() => toggleSidebar(false)}>
                    <span>All Records</span>
                  </NavLink>
                  <NavLink to="/training/add" className={subNavClass('/training/add')} onClick={() => toggleSidebar(false)}>
                    <span>Add Record</span>
                  </NavLink>
                  <NavLink to="/bulk-upload" className={subNavClass('/bulk-upload')} onClick={() => toggleSidebar(false)}>
                    <span>Bulk Upload</span>
                  </NavLink>
                </div>
              )}
            </div>

            <NavLink to="/staff" className={navClass('/staff')} onClick={() => toggleSidebar(false)}>
              <Users className="w-4 h-4" />
              <span>Staff Master</span>
            </NavLink>

            {superAdminOnly && (
              <NavLink to="/users" className={navClass('/users')} onClick={() => toggleSidebar(false)}>
                <ShieldCheck className="w-4 h-4" />
                <span>User Management</span>
              </NavLink>
            )}

            {/* Collapsible: Reports */}
            <div>
              <button 
                onClick={() => !user?.mustChangePassword && setReportsOpen(!reportsOpen)}
                disabled={user?.mustChangePassword}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  user?.mustChangePassword
                    ? 'opacity-40 cursor-not-allowed pointer-events-none text-slate-400'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <TrendingUp className="w-4 h-4" />
                  <span>Reports</span>
                </div>
                {reportsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {reportsOpen && (
                <div className="mt-1 space-y-1">
                  <NavLink to="/reports/monthly" className={subNavClass('/reports/monthly')} onClick={() => toggleSidebar(false)}>
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Monthly Report</span>
                  </NavLink>
                  <NavLink to="/reports/quarterly" className={subNavClass('/reports/quarterly')} onClick={() => toggleSidebar(false)}>
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>Quarterly Report</span>
                  </NavLink>
                  <NavLink to="/reports/financial-year" className={subNavClass('/reports/financial-year')} onClick={() => toggleSidebar(false)}>
                    <FileBarChart className="w-3.5 h-3.5" />
                    <span>FY Report</span>
                  </NavLink>
                  <NavLink to="/reports/staff-wise" className={subNavClass('/reports/staff-wise')} onClick={() => toggleSidebar(false)}>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Staff-Wise</span>
                  </NavLink>
                  <NavLink to="/reports/department-wise" className={subNavClass('/reports/department-wise')} onClick={() => toggleSidebar(false)}>
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Group-Wise</span>
                  </NavLink>
                  <NavLink to="/reports/cost-analysis" className={subNavClass('/reports/cost-analysis')} onClick={() => toggleSidebar(false)}>
                    <IndianRupee className="w-3.5 h-3.5" />
                    <span>Cost Analysis</span>
                  </NavLink>
                  <NavLink to="/reports/training-status" className={subNavClass('/reports/training-status')} onClick={() => toggleSidebar(false)}>
                    <Info className="w-3.5 h-3.5" />
                    <span>Training Status</span>
                  </NavLink>
                  <NavLink to="/reports/beneficiaries" className={subNavClass('/reports/beneficiaries')} onClick={() => toggleSidebar(false)}>
                    <Layers className="w-3.5 h-3.5" />
                    <span>Beneficiary Report</span>
                  </NavLink>
                </div>
              )}
            </div>

            {superAdminOnly && (
              <NavLink to="/master" className={navClass('/master')} onClick={() => toggleSidebar(false)}>
                <Database className="w-4 h-4" />
                <span>Master Data</span>
              </NavLink>
            )}

            <NavLink to="/audit" className={navClass('/audit')} onClick={() => toggleSidebar(false)}>
              <History className="w-4 h-4" />
              <span>Audit Logs</span>
            </NavLink>

            <NavLink to="/change-password" className={navClass('/change-password')} onClick={() => toggleSidebar(false)}>
              <Lock className="w-4 h-4" />
              <span>Change Password</span>
            </NavLink>

            {superAdminOnly && (
              <NavLink to="/settings" className={navClass('/settings')} onClick={() => toggleSidebar(false)}>
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </NavLink>
            )}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
