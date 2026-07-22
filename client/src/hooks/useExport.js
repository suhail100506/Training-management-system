import { useState } from 'react';
import { saveAs } from 'file-saver';
import { exportReport } from '../api/reports.api';
import { toast } from 'react-toastify';

export const useExport = () => {
  const [exporting, setExporting] = useState(false);

  const triggerExport = async (reportType, format, filters = {}) => {
    setExporting(true);
    const toastId = toast.loading(`Generating ${format.toUpperCase()} export...`);

    try {
      const response = await exportReport(reportType, format, filters);
      
      const contentTypes = {
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        pdf: 'application/pdf',
        csv: 'text/csv'
      };

      const extensions = {
        excel: 'xlsx',
        pdf: 'pdf',
        csv: 'csv'
      };

      const contentType = contentTypes[format] || 'application/octet-stream';
      const extension = extensions[format] || 'xlsx';
      
      const blob = new Blob([response.data], { type: contentType });
      
      // Calculate YYYYMMDD string in local time
      const dateObj = new Date();
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const yyyymmdd = `${year}${month}${day}`;

      // Build filter summary string
      const summaryKeys = [];
      if (filters.financialYear) summaryKeys.push(filters.financialYear.replace(/\s+/g, ''));
      if (filters.quarter) {
        const qVal = Array.isArray(filters.quarter) ? filters.quarter.join('_') : filters.quarter;
        summaryKeys.push(qVal);
      }
      if (filters.group) {
        const gVal = Array.isArray(filters.group) ? filters.group[0] : filters.group;
        summaryKeys.push(gVal);
      }

      const summaryStr = summaryKeys.join('_').replace(/[^a-zA-Z0-9_]/g, '') || 'All';
      
      const filename = `TMS_${reportType.toUpperCase()}_${summaryStr}_${yyyymmdd}.${extension}`;
      
      saveAs(blob, filename);
      
      toast.update(toastId, {
        render: `${format.toUpperCase()} exported successfully!`,
        type: 'success',
        isLoading: false,
        autoClose: 3000
      });
    } catch (err) {
      console.error('Excel/PDF/CSV file writing failure:', err);
      toast.update(toastId, {
        render: `Failed to export ${format.toUpperCase()} report.`,
        type: 'error',
        isLoading: false,
        autoClose: 4000
      });
    } finally {
      setExporting(false);
    }
  };

  return {
    triggerExport,
    exporting
  };
};

export default useExport;
