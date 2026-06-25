import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import useAuth from '../../hooks/useAuth';
import { AlertTriangle, Timer } from 'lucide-react';

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { showExpiryWarning, timeLeft, extendSession } = useAuth();

  const toggleSidebar = (val) => {
    setSidebarOpen(typeof val === 'boolean' ? val : !sidebarOpen);
  };

  const handleExtend = async () => {
    await extendSession();
  };

  const formatTimeLeft = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex transition-colors duration-200">
      {/* Sidebar Panel */}
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:pl-64 print:pl-0 min-w-0">
        
        {/* Sticky warning banner about session expiration */}
        {showExpiryWarning && (
          <div className="print:hidden sticky top-0 z-50 bg-amber-500 text-slate-950 px-4 py-2 flex items-center justify-between text-xs font-semibold shadow-md border-b border-amber-600 animate-pulse">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 animate-bounce" />
              <span>Session Expiring:</span>
              <span className="bg-slate-950 text-white px-2 py-0.5 rounded font-mono flex items-center space-x-1">
                <Timer className="w-3 h-3 inline" />
                <span>{formatTimeLeft(timeLeft)}</span>
              </span>
              <span className="hidden md:inline">left before your session terminates automatically.</span>
            </div>
            <button 
              onClick={handleExtend}
              className="bg-slate-950 text-white hover:bg-slate-850 px-3 py-1 rounded-md font-bold transition-all duration-200 shadow-sm"
            >
              Extend Session
            </button>
          </div>
        )}

        {/* Global Header */}
        <Navbar toggleSidebar={toggleSidebar} />

        {/* Dynamic Page Output Slot */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
