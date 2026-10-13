// Design Ref: §4.2, §6.1, §7 (v0.2) — the import size limit lives in domain so the UI can reject a
// file before reading it (components may not import storage/) and storage shares the same value.
import { fail, ok } from './errors';
import type { Result } from './todo';

/** Files above this size are rejected before reading (IMPORT_TOO_LARGE). */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

// Plan SC: FR-13 — oversized files are refused up front, without reading their content
export function checkImportFileSize(sizeInBytes: number): Result<void> {
  return sizeInBytes > MAX_IMPORT_BYTES ? fail('IMPORT_TOO_LARGE') : ok(undefined);
}
