import { describe, expect, it } from 'vitest';
import { MAX_IMPORT_BYTES } from '@/domain/importFile';
import { makeFixtureTodos, makeTodo } from '@/test/factories';
import { MemoryStorage, QuotaExceededStorage } from '@/test/fakeStorage';
import { backupBeforeImport, exportTodos, parseImportFile } from './backup';
import { PRE_IMPORT_BACKUP_KEY } from './schema';
import type { AppError } from '@/domain/todo';

// Local 2026-10-12 09:00, so the file name does not depend on the machine's time zone.
const NOW = new Date(2026, 9, 12, 9, 0, 0);

function expectError(text: string): AppError {
  const result = parseImportFile(text);
  if (result.ok) throw new Error('expected an error result');
  return result.error;
}

describe('exportTodos', () => {
  it('names the file with the local date and writes the export format', () => {
    const todos = makeFixtureTodos();
    const { filename, json } = exportTodos(todos, NOW);

    expect(filename).toBe('todo-app-backup-2026-10-12.json');
    expect(JSON.parse(json)).toEqual({
      app: 'todo-app',
      schemaVersion: 1,
      exportedAt: NOW.toISOString(),
      todos,
    });
  });
});

describe('exportTodos -> parseImportFile (§8.2 #11)', () => {
  it('round-trips the same todos', () => {
    const todos = makeFixtureTodos();

    expect(parseImportFile(exportTodos(todos, NOW).json)).toEqual({ ok: true, value: todos });
  });

  it('round-trips an empty list', () => {
    expect(parseImportFile(exportTodos([], NOW).json)).toEqual({ ok: true, value: [] });
  });
});

describe('parseImportFile errors (§8.2 #12)', () => {
  const validFile = (overrides: Record<string, unknown>) =>
    JSON.stringify({
      app: 'todo-app',
      schemaVersion: 1,
      exportedAt: NOW.toISOString(),
      todos: [],
      ...overrides,
    });

  it('returns IMPORT_TOO_LARGE for text over the 5MB limit without parsing it', () => {
    expect(expectError(' '.repeat(MAX_IMPORT_BYTES + 1)).code).toBe('IMPORT_TOO_LARGE');
  });

  it('returns IMPORT_INVALID_JSON for text that is not JSON', () => {
    expect(expectError('{ not json').code).toBe('IMPORT_INVALID_JSON');
    expect(expectError('').code).toBe('IMPORT_INVALID_JSON');
  });

  it.each(['null', '[]', '"todo-app"', '42'])('returns IMPORT_SCHEMA_MISMATCH for %s', (text) => {
    expect(expectError(text).code).toBe('IMPORT_SCHEMA_MISMATCH');
  });

  it('returns IMPORT_SCHEMA_MISMATCH for another app', () => {
    const error = expectError(validFile({ app: 'other-app' }));

    expect(error.code).toBe('IMPORT_SCHEMA_MISMATCH');
    expect(error.message).toContain('(app)');
  });

  it('returns IMPORT_SCHEMA_MISMATCH for schemaVersion 2', () => {
    const error = expectError(validFile({ schemaVersion: 2 }));

    expect(error.code).toBe('IMPORT_SCHEMA_MISMATCH');
    expect(error.message).toContain('(schemaVersion)');
  });

  it('returns IMPORT_SCHEMA_MISMATCH naming the first invalid field', () => {
    const todos = [makeTodo(), { ...makeTodo(), priority: 'urgent' }, { ...makeTodo(), title: '' }];
    const error = expectError(validFile({ todos }));

    expect(error).toEqual({
      code: 'IMPORT_SCHEMA_MISMATCH',
      message: 'todo-app 백업 파일이 아니거나 형식이 맞지 않습니다 (todos[1].priority)',
    });
  });

  it('returns IMPORT_SCHEMA_MISMATCH when todos is missing', () => {
    expect(expectError(validFile({ todos: undefined })).message).toContain('(todos)');
  });
});

describe('backupBeforeImport', () => {
  it('stores the current todos under the pre-import key', () => {
    const storage = new MemoryStorage();
    const todos = makeFixtureTodos();

    expect(backupBeforeImport(storage, todos)).toEqual({ ok: true, value: undefined });
    expect(JSON.parse(storage.getItem(PRE_IMPORT_BACKUP_KEY) ?? '')).toEqual({
      schemaVersion: 1,
      todos,
    });
  });

  it('returns IMPORT_BACKUP_FAILED instead of throwing when the storage is full', () => {
    const result = backupBeforeImport(new QuotaExceededStorage(), [makeTodo()]);

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'IMPORT_BACKUP_FAILED',
        message: '현재 데이터를 백업하지 못해 가져오기를 취소했습니다. 기존 데이터는 그대로입니다',
      },
    });
  });
});
