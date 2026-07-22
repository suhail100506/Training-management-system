const PdfPrinter = require('pdfmake');

// Use native PDF fonts (Helvetica) to avoid local path resolution failures in sandbox
const fonts = {
  Roboto: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italic: 'Helvetica-Oblique',
    bolditalic: 'Helvetica-BoldOblique'
  }
};

const printer = new PdfPrinter(fonts);

/**
 * Builds the PDFMake document structure.
 */
const generatePDFDefinition = (reportName, data, filters = {}) => {
  const headers = Object.keys(data[0] || {});
  
  const body = [];

  // 1. Add headers row
  if (headers.length > 0) {
    body.push(headers.map(h => ({
      text: h,
      style: 'tableHeader',
      alignment: 'left'
    })));
  }

  // 2. Add data rows
  data.forEach((row, rowIndex) => {
    const rowCells = headers.map(header => {
      let val = row[header];
      if (val === null || val === undefined) {
        val = '';
      }
      
      let textStr = String(val);
      // Basic formatting formatting for currency values
      const hLower = header.toLowerCase();
      if (typeof val === 'number' && (hLower.includes('cost') || hLower.includes('amount') || hLower.includes('price'))) {
        textStr = '₹' + Number(val).toLocaleString('en-IN');
      }

      return {
        text: textStr,
        style: 'tableCell'
      };
    });
    body.push(rowCells);
  });

  const filterStrings = [];
  Object.entries(filters).forEach(([key, val]) => {
    if (val && val !== '') {
      filterStrings.push(`${key}: ${Array.isArray(val) ? val.join(', ') : val}`);
    }
  });
  const filterSummary = filterStrings.length > 0 ? filterStrings.join(' | ') : 'None';

  const docDefinition = {
    content: [
      { text: 'Training Management System', style: 'brandTitle' },
      { text: `${reportName.toUpperCase()} REPORT`, style: 'reportTitle' },
      { text: `Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)`, style: 'metaText' },
      { text: `Filters Applied: ${filterSummary}`, style: 'metaText' },
      { text: ' ', margin: [0, 8] },
      {
        style: 'tableReport',
        table: {
          headerRows: 1,
          body: body
        },
        layout: {
          fillColor: function (rowIndex) {
            if (rowIndex === 0) return '#1F4E79'; // Navy blue header
            return (rowIndex % 2 === 0) ? '#F9F9F9' : '#FFFFFF'; // alternating
          },
          hLineWidth: function () { return 0.5; },
          vLineWidth: function () { return 0.5; },
          hLineColor: function () { return '#E0E0E0'; },
          vLineColor: function () { return '#E0E0E0'; }
        }
      }
    ],
    footer: function (currentPage, pageCount) {
      return {
        text: `Page ${currentPage} of ${pageCount}`,
        alignment: 'center',
        style: 'footerText',
        margin: [0, 10, 0, 0]
      };
    },
    styles: {
      brandTitle: { fontSize: 16, bold: true, color: '#1F4E79', margin: [0, 0, 0, 2] },
      reportTitle: { fontSize: 12, bold: true, color: '#333333', margin: [0, 0, 0, 4] },
      metaText: { fontSize: 9, italic: true, color: '#666666', margin: [0, 0, 0, 2] },
      tableHeader: { bold: true, fontSize: 8.5, color: '#FFFFFF', margin: [4, 6, 4, 6] },
      tableCell: { fontSize: 7.5, margin: [4, 4, 4, 4], color: '#333333' },
      footerText: { fontSize: 8, color: '#999999' }
    },
    pageOrientation: headers.length > 6 ? 'landscape' : 'portrait',
    pageMargins: [30, 40, 30, 40]
  };

  return docDefinition;
};

/**
 * Pipes the PDFKit Document to the express response.
 */
const sendPDF = (res, docDefinition) => {
  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  pdfDoc.pipe(res);
  pdfDoc.end();
};

module.exports = {
  generatePDFDefinition,
  sendPDF
};
