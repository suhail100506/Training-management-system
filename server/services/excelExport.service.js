const ExcelJS = require('exceljs');

/**
 * Generates an Excel file buffer from tabular report data.
 */
const generateExcel = async (reportName, data, filters = {}) => {
  const workbook = new ExcelJS.Workbook();
  const sheetName = reportName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
  const worksheet = workbook.addWorksheet(sheetName.toUpperCase());

  // 1. Add Title & Metadata Block
  const titleRow = worksheet.addRow([`TMS - ${reportName.toUpperCase()} REPORT`]);
  titleRow.getCell(1).font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF1F497D' } };
  
  const genDateStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const dateRow = worksheet.addRow([`Generated on: ${genDateStr} (IST)`]);
  dateRow.getCell(1).font = { name: 'Segoe UI', size: 10, italic: true };

  const filterStrings = [];
  Object.entries(filters).forEach(([key, val]) => {
    if (val && val !== '') {
      filterStrings.push(`${key}: ${Array.isArray(val) ? val.join(', ') : val}`);
    }
  });
  const filterSummary = filterStrings.length > 0 ? filterStrings.join(' | ') : 'None';
  const filterRow = worksheet.addRow([`Filters applied: ${filterSummary}`]);
  filterRow.getCell(1).font = { name: 'Segoe UI', size: 10, italic: true };

  // Spacer
  worksheet.addRow([]);

  if (data.length === 0) {
    const emptyRow = worksheet.addRow(['No records found matching filters.']);
    emptyRow.getCell(1).font = { name: 'Segoe UI', size: 11, italic: true };
    return await workbook.xlsx.writeBuffer();
  }

  // 2. Add Header Row
  const headers = Object.keys(data[0]);
  const headerRow = worksheet.addRow(headers);
  headerRow.height = 25;

  headerRow.eachCell((cell) => {
    cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E79' } // Corporate Navy Blue
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
    };
  });

  // 3. Add Data Rows
  data.forEach((row, index) => {
    const rowValues = Object.values(row);
    const addedRow = worksheet.addRow(rowValues);
    addedRow.height = 20;

    // Alternating row background shading
    const isEven = index % 2 === 0;
    const bgArgb = isEven ? 'FFFFFFFF' : 'FFF2F2F2';

    addedRow.eachCell((cell) => {
      cell.font = { name: 'Segoe UI', size: 10 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgArgb }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
      };

      // Currency Formatting Helper
      if (typeof cell.value === 'number') {
        // If column name has 'cost' or 'amount' or 'person', format as Indian Currency
        const colName = headers[cell.col - 1].toLowerCase();
        if (colName.includes('cost') || colName.includes('price') || colName.includes('amount')) {
          cell.numFmt = '"₹"##,##,##0';
        }
      }
    });
  });

  // 4. View properties & Auto-fitting Column Widths
  worksheet.views = [
    { state: 'frozen', ySplit: 5 } // Freeze title section + headers (rows 1 to 5)
  ];

  worksheet.columns.forEach((col) => {
    let maxLen = 0;
    col.eachCell({ includeEmpty: true }, (cell, rowNum) => {
      if (rowNum <= 5) return; // Skip title row for length calc
      let cellStr = '';
      if (cell.value !== null && cell.value !== undefined) {
        cellStr = String(cell.value);
        if (cell.numFmt && cellStr.match(/^\d+$/)) {
          cellStr = '₹' + cellStr; // approximate formatted width
        }
      }
      if (cellStr.length > maxLen) {
        maxLen = cellStr.length;
      }
    });
    col.width = Math.max(maxLen + 4, 12);
  });

  return await workbook.xlsx.writeBuffer();
};

module.exports = {
  generateExcel
};
