import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { Menu, Sun, Moon, LogOut, ChevronRight, User, Edit, X, Download } from 'lucide-react';
import * as userApi from '../../api/user.api';
import { toast } from 'react-toastify';

const Navbar = ({ toggleSidebar }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, setUser } = useAuth();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isChangeNameModalOpen, setIsChangeNameModalOpen] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  // Sync newName when user object changes
  useEffect(() => {
    if (user?.name) {
      setNewName(user.name);
    }
  }, [user]);

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error('Name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      await userApi.updateUser(user._id || user.id, { name: newName });
      const updatedUser = { ...user, name: newName };
      setUser(updatedUser);
      sessionStorage.setItem('user', JSON.stringify(updatedUser));
      toast.success('Username updated successfully!');
      setIsChangeNameModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update username.');
    } finally {
      setSaving(false);
    }
  };

  // Create simple breadcrumbs from pathname
  const generateBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    if (paths.length === 0) return [{ label: 'Dashboard', path: '/dashboard' }];
    
    return paths.map((path, index) => {
      const url = `/${paths.slice(0, index + 1).join('/')}`;
      const label = path
        .replace(/-/g, ' ')
        .replace(/^\w/, (c) => c.toUpperCase());
      return { label, path: url };
    });
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <header className="print:hidden h-16 flex items-center justify-between px-6 bg-white dark:bg-slate-900 border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm transition-colors duration-200">
      {/* Left section: Drawer Toggle and Breadcrumbs */}
      <div className="flex items-center space-x-4">
        <button 
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden text-slate-500 dark:text-slate-400"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumbs */}
        {!user?.mustChangePassword ? (
          <nav className="hidden sm:flex items-center space-x-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Link to="/dashboard" className="hover:text-brand-700 dark:hover:text-brand-400">Home</Link>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.path}>
                <ChevronRight className="w-3 h-3 text-slate-400" />
                <Link 
                  to={crumb.path} 
                  className={`hover:text-brand-700 dark:hover:text-brand-400 ${
                    idx === breadcrumbs.length - 1 ? 'text-slate-900 dark:text-white font-semibold' : ''
                  }`}
                >
                  {crumb.label}
                </Link>
              </React.Fragment>
            ))}
          </nav>
        ) : (
          <span className="text-xs font-bold text-slate-500">Security Configuration</span>
        )}
      </div>

      {/* Right section: Dark Mode toggle & User actions */}
      <div className="flex items-center space-x-4">
        {/* PDF Download Button for Dashboard */}
        {location.pathname === '/dashboard' && (
          <button 
            onClick={() => window.print()}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-650 dark:text-slate-350 transition-all duration-200 cursor-pointer"
            title="Download Dashboard PDF"
          >
            <Download className="w-4 h-4" />
          </button>
        )}

        {/* Theme Toggle Button */}
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 transition-all duration-200"
          title="Toggle Light/Dark Theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Avatar Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2.5 focus:outline-none p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors duration-150 cursor-pointer"
          >
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{user?.name}</span>
              <span className="text-[9px] text-slate-400 capitalize">{user?.role.replace('_', ' ')}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 border border-slate-300/40 dark:border-slate-700/40 animate-duration-150">
              <User className="w-4.5 h-4.5" />
            </div>
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl shadow-lg py-1.5 z-20 animate-in fade-in slide-in-from-top-2 duration-100">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    setIsChangeNameModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  <Edit className="w-4 h-4 text-slate-400" />
                  <span>Change Username</span>
                </button>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-bold text-red-655 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center space-x-2 border-t border-slate-100 dark:border-slate-800 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span>Log Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Change Username Modal */}
      {isChangeNameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Change Username</h3>
              <button 
                onClick={() => setIsChangeNameModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveName} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  New Username / Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-850 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="Enter new name"
                  disabled={saving}
                  required
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChangeNameModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 bg-white dark:bg-slate-900 text-xs font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 transition-all duration-200 cursor-pointer"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold rounded-xl transition-all duration-200 shadow-md flex items-center space-x-1.5 cursor-pointer"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
