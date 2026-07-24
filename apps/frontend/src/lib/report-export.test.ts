import ExcelJS from 'exceljs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportToExcel, exportToPdf } from './report-export';

function captureBlobParts() {
  const captured: { parts: BlobPart[]; type: string }[] = [];
  const OriginalBlob = globalThis.Blob;

  class CapturingBlob extends OriginalBlob {
    constructor(parts: BlobPart[], options?: BlobPropertyBag) {
      super(parts, options);
      captured.push({ parts, type: options?.type ?? '' });
    }
  }

  vi.stubGlobal('Blob', CapturingBlob);
  return captured;
}

beforeEach(() => {
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('exportToExcel', () => {
  it('produces a workbook with one sheet per non-empty dataset, headers, and rows', async () => {
    const captured = captureBlobParts();

    await exportToExcel('reporte.xlsx', [
      {
        name: 'Produccion por doctor',
        rows: [{ Doctor: 'Ana Diaz', Tratamientos: 2, Produccion: 600 }],
      },
      { name: 'Vacio', rows: [] },
    ]);

    expect(captured).toHaveLength(1);
    expect(captured[0].type).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    const reloaded = new ExcelJS.Workbook();
    const [buffer] = captured[0].parts as [ArrayBuffer];
    await reloaded.xlsx.load(buffer);

    expect(reloaded.worksheets.map((ws) => ws.name)).toEqual([
      'Produccion por doctor',
    ]);
    const sheet = reloaded.getWorksheet('Produccion por doctor')!;
    expect(sheet.getRow(1).values).toEqual([
      undefined,
      'Doctor',
      'Tratamientos',
      'Produccion',
    ]);
    expect(sheet.getRow(2).values).toEqual([
      undefined,
      'Ana Diaz',
      2,
      600,
    ]);
  });

  it('triggers no download when every sheet is empty', async () => {
    const captured = captureBlobParts();

    await exportToExcel('reporte.xlsx', [{ name: 'Vacio', rows: [] }]);

    expect(captured).toHaveLength(0);
  });
});

describe('exportToPdf', () => {
  it('builds the document with multiple sections, skipping empty ones, without throwing', () => {
    expect(() =>
      exportToPdf(
        'reporte.pdf',
        'Reportes ejecutivos',
        '2026-01-01 — 2026-01-31',
        [
          {
            heading: 'Producción por doctor',
            columns: ['Doctor', 'Total'],
            rows: [['Ana Diaz', '$600.00']],
          },
          { heading: 'Vacio', columns: ['A'], rows: [] },
        ],
      ),
    ).not.toThrow();
  });
});
