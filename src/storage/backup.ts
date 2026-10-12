// Design Ref: §3.3, §4.2, §7 — JSON export/import file format and the pre-import safety backup.
import { toLocalDateString } from '@/domain/date';
import { fail, makeError } from '@/domain/errors';
import {
  CURRENT_SCHEMA_VERSION,
  PRE_IMPORT_BACKUP_KEY,
  parseTodoList,
  toStoredData,
} from './schema';
import type { Result, Todo } from '@/domain/todo';

export const EXPORT_APP_ID = 'todo-app';
/** Files above this size are rejected by the UI before reading (IMPORT_TOO_LARGE). */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

const JSON_INDENT = 2;

export interface ExportFile {
  filename: string;
  json: string;
}

export interface ExportData {
  app: typeof EXPORT_APP_ID;
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  exportedAt: string;
  todos: Todo[];
}

export function exportTodos(todos: Todo[], now: Date): ExportFile {
  const data: ExportData = {
    app: EXPORT_APP_ID,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    todos,
  };
  // Plan SC: FR-13 — the file name carries the local date of the export
  return {
    filename: `todo-app-backup-${toLocalDateString(now)}.json`,
    json: JSON.stringify(data, null, JSON_INDENT),
  };
}

export function parseImportFile(text: string): Result<Todo[]> {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return fail('IMPORT_INVALID_JSON');
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return schemaMismatch();
  }
  const { app, schemaVersion, todos } = data as Record<string, unknown>;
  // Plan SC: FR-13 — only todo-app files of a supported schema version are accepted
  if (app !== EXPORT_APP_ID) return schemaMismatch('app');
  if (schemaVersion !== CURRENT_SCHEMA_VERSION) return schemaMismatch('schemaVersion');

  const parsed = parseTodoList(todos);
  return parsed.ok ? parsed : schemaMismatch(parsed.error.path);
}

/**
 * Copies the current todos aside right before an import replaces them (FR-13).
 * Best-effort, as the §4.1 signature returns void: a failed write (e.g. full storage) is ignored
 * so the user's confirmed import still goes ahead.
 */
export function backupBeforeImport(storage: Storage, todos: Todo[]): void {
  try {
    storage.setItem(PRE_IMPORT_BACKUP_KEY, JSON.stringify(toStoredData(todos)));
  } catch {
    // Ignored on purpose; see the doc comment.
  }
}

/** IMPORT_SCHEMA_MISMATCH whose message names the first invalid field (§4.2). */
function schemaMismatch(path?: string): Result<never> {
  if (path === undefined) return fail('IMPORT_SCHEMA_MISMATCH');
  const error = makeError('IMPORT_SCHEMA_MISMATCH');
  return { ok: false, error: { ...error, message: `${error.message} (${path})` } };
}
