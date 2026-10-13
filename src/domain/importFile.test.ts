import { describe, expect, it } from 'vitest';
import { MAX_IMPORT_BYTES, checkImportFileSize } from './importFile';

describe('checkImportFileSize', () => {
  it('limits imports to 5MB', () => {
    expect(MAX_IMPORT_BYTES).toBe(5 * 1024 * 1024);
  });

  it('accepts files up to and including the limit', () => {
    expect(checkImportFileSize(0)).toEqual({ ok: true, value: undefined });
    expect(checkImportFileSize(MAX_IMPORT_BYTES)).toEqual({ ok: true, value: undefined });
  });

  it('rejects larger files with IMPORT_TOO_LARGE', () => {
    expect(checkImportFileSize(MAX_IMPORT_BYTES + 1)).toEqual({
      ok: false,
      error: { code: 'IMPORT_TOO_LARGE', message: '5MB 이하 파일만 가져올 수 있습니다' },
    });
  });
});
