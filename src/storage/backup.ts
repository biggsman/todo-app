// Design Ref: §3.3, §4.2, §7 — JSON export/import file format and the pre-import safety backup.
import { toLocalDateString } from '@/domain/date';
import { fail, makeError, ok } from '@/domain/errors';
import { MAX_IMPORT_BYTES } from '@/domain/importFile';
import {
  CURRENT_SCHEMA_VERSION,
  PRE_IMPORT_BACKUP_KEY,
  parseTodoList,
  toStoredData,
} from './schema';
import type { Result, Todo } from '@/domain/todo';

export const EXPORT_APP_ID = 'todo-app';

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
  // Defense in depth: the UI checks the file size first. A UTF-8 file has at least as many bytes
  // as its text has UTF-16 code units, so a longer text is certainly over the limit.
  if (text.length > MAX_IMPORT_BYTES) return fail('IMPORT_TOO_LARGE');

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
 * A failed write (e.g. full storage) is reported so the caller can cancel the import (§4.1 v0.2).
 */
export function backupBeforeImport(storage: Storage, todos: Todo[]): Result<void> {
  try {
    storage.setItem(PRE_IMPORT_BACKUP_KEY, JSON.stringify(toStoredData(todos)));
    return ok(undefined);
  } catch {
    // Plan SC: FR-13 — without a safety copy the current data must not be replaced
    return fail('IMPORT_BACKUP_FAILED');
  }
}

/** `todos[2].priority` and `todos[0]` as produced by parseTodoList (schema.ts). */
const TODO_PATH = /^todos\[(\d+)\](?:\.(\w+))?$/;

/**
 * Human-readable location for the toast (§4.2, §6.1 v0.3): `todos[2].priority` →
 * `3번째 항목의 priority`, `todos[0]` → `1번째 항목`. Top-level keys (`app`, `schemaVersion`,
 * `todos`) stay as they are, since they name what the user would look for in the file.
 */
export function describeSchemaPath(path: string): string {
  const match = TODO_PATH.exec(path);
  if (!match) return path;
  const position = `${Number(match[1]) + 1}번째 항목`;
  return match[2] ? `${position}의 ${match[2]}` : position;
}

/** IMPORT_SCHEMA_MISMATCH whose message names the first invalid field (§4.2). */
function schemaMismatch(path?: string): Result<never> {
  if (path === undefined) return fail('IMPORT_SCHEMA_MISMATCH');
  const error = makeError('IMPORT_SCHEMA_MISMATCH');
  // Plan SC: FR-13 — the user can find the broken spot in the file
  return {
    ok: false,
    error: { ...error, message: `${error.message} (${describeSchemaPath(path)})` },
  };
}
