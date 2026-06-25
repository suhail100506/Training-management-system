import React from 'react';
import EmptyState from './EmptyState';

const DataTable = ({
  columns,
  data = [],
  loading = false,
  pagination = null,
  selectedRowIds = []
}) => {
  // Render pulse loader placeholders
  const renderSkeletons = () => {
    return Array.from({ length: 5 }).map((_, rowIndex) => (
      <tr key={rowIndex} className="border-b border-slate-100 dark:border-slate-850 animate-pulse">
        {columns.map((_, colIndex) => (
          <td key={colIndex} className="px-6 py-4.5">
            <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
          </td>
        ))}
      </tr>
    ));
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850/50 rounded-2xl shadow-sm overflow-hidden transition-all duration-150">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200/50 dark:border-slate-850/40 text-slate-500 dark:text-slate-400">
              {columns.map((col, index) => (
                <th
                  key={index}
                  className="px-6 py-3.5 text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
            {loading ? (
              renderSkeletons()
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="bg-white dark:bg-slate-900">
                  <EmptyState />
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => {
                const isSelected = selectedRowIds?.includes(row._id);
                return (
                  <tr
                    key={rowIndex}
                    className={`${
                      isSelected ? 'font-semibold text-slate-900 dark:text-white' : ''
                    } hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors duration-150 text-slate-700 dark:text-slate-350 text-xs`}
                  >
                    {columns.map((col, colIndex) => (
                      <td 
                        key={colIndex} 
                        className={`px-6 py-4 whitespace-nowrap transition-colors duration-150 ${
                          isSelected ? 'bg-cyan-100/80 dark:bg-cyan-950/40' : ''
                        }`}
                      >
                        {col.render ? col.render(row, rowIndex) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {!loading && pagination && data.length > 0 && (
        <div className="px-6 py-3.5 border-t border-slate-200/50 dark:border-slate-850/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/30 dark:bg-slate-950/20">
          <div className="flex items-center space-x-2">
            <span>Show</span>
            <select
              value={pagination.limit}
              onChange={(e) => pagination.handleLimitChange(Number(e.target.value))}
              className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg px-2 py-0.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500 text-xs"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>records</span>
          </div>

          <div className="flex items-center justify-between sm:justify-end space-x-4">
            <span>
              Page <span className="font-bold text-slate-850 dark:text-white">{pagination.page}</span> of{' '}
              <span className="font-bold text-slate-850 dark:text-white">{pagination.totalPages || 1}</span>
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => pagination.handlePageChange(pagination.page - 1)}
                className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => pagination.handlePageChange(pagination.page + 1)}
                className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
