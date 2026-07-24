import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export type ReportSheet = {
  name: string;
  rows: Record<string, string | number>[];
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportToExcel(filename: string, sheets: ReportSheet[]) {
  const workbook = new ExcelJS.Workbook();

  for (const sheet of sheets) {
    if (sheet.rows.length === 0) continue;

    const worksheet = workbook.addWorksheet(sheet.name.slice(0, 31));
    const headers = Object.keys(sheet.rows[0]);
    worksheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: Math.max(header.length + 4, 16),
    }));
    worksheet.getRow(1).font = { bold: true };
    worksheet.addRows(sheet.rows);
  }

  if (workbook.worksheets.length === 0) return;

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    filename,
  );
}

export type ReportPdfSection = {
  heading: string;
  columns: string[];
  rows: (string | number)[][];
};

export function exportToPdf(
  filename: string,
  title: string,
  subtitle: string,
  sections: ReportPdfSection[],
) {
  const doc = new jsPDF();
  let cursorY = 18;

  doc.setFontSize(16);
  doc.text(title, 14, cursorY);
  cursorY += 7;

  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(subtitle, 14, cursorY);
  doc.setTextColor(0);
  cursorY += 8;

  for (const section of sections) {
    if (section.rows.length === 0) continue;

    doc.setFontSize(12);
    doc.text(section.heading, 14, cursorY);
    cursorY += 4;

    autoTable(doc, {
      startY: cursorY,
      head: [section.columns],
      body: section.rows.map((row) => row.map(String)),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 41, 59] },
      margin: { left: 14, right: 14 },
    });

    // jspdf-autotable's functional API (v4/v5) still stamps this on the doc
    // instance for backwards compat, but doesn't declare it in its types.
    const docWithAutoTable = doc as unknown as {
      lastAutoTable: { finalY: number };
    };
    cursorY = docWithAutoTable.lastAutoTable.finalY + 12;
  }

  doc.save(filename);
}
