import React, { useEffect } from 'react';

const PageTitle = ({ title, subtitle }) => {
  useEffect(() => {
    const updateTitle = () => {
      const savedName = localStorage.getItem('tms_systemName') || 'Training Management System';
      document.title = `${title} — ${savedName}`;
    };

    updateTitle();

    window.addEventListener('tms_settings_changed', updateTitle);
    return () => {
      window.removeEventListener('tms_settings_changed', updateTitle);
    };
  }, [title]);

  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-8">
        {title}
      </h1>
      {subtitle && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default PageTitle;
