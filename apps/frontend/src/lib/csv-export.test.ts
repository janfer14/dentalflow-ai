import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportToCsv } from './csv-export';

function captureBlobText() {
  const captured: { text: string; type: string }[] = [];
  const OriginalBlob = globalThis.Blob;

  class CapturingBlob extends OriginalBlob {
    constructor(parts: BlobPart[], options?: BlobPropertyBag) {
      super(parts, options);
      captured.push({
        text: parts.join(''),
        type: options?.type ?? '',
      });
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
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('exportToCsv', () => {
  it('does nothing when there are no rows', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');

    exportToCsv('empty.csv', []);

    expect(clickSpy).not.toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('derives headers from the first row and joins values with commas', () => {
    const captured = captureBlobText();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    exportToCsv('patients.csv', [
      { name: 'Ana Diaz', visits: 3 },
      { name: 'Luis Perez', visits: 5 },
    ]);

    expect(captured[0].text).toBe(
      '﻿name,visits\nAna Diaz,3\nLuis Perez,5',
    );
  });

  it('quotes and escapes values containing commas, quotes, or newlines', () => {
    const captured = captureBlobText();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    exportToCsv('notes.csv', [
      { note: 'Diagnóstico: caries, dolor' },
      { note: 'Dijo "no duele"' },
      { note: 'línea 1\nlínea 2' },
    ]);

    const body = captured[0].text.replace(/^﻿/, '');
    expect(body).toBe(
      [
        'note',
        '"Diagnóstico: caries, dolor"',
        '"Dijo ""no duele"""',
        '"línea 1\nlínea 2"',
      ].join('\n'),
    );
  });

  it('triggers a download with the given filename', () => {
    captureBlobText();
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    exportToCsv('reporte.csv', [{ total: 100 }]);

    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();
  });
});
