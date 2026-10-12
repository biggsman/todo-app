import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeFixtureTodos, makeTodo } from '@/test/factories';
import { BlockedStorage, MemoryStorage, QuotaExceededStorage } from '@/test/fakeStorage';
import { CORRUPT_BACKUP_KEY, STORAGE_KEY, toStoredData } from './schema';
import { getBrowserStorage, isQuotaExceededError, loadTodos, saveTodos } from './todoStorage';

describe('loadTodos (§8.2 #9)', () => {
  it('returns an empty list when nothing is stored', () => {
    expect(loadTodos(new MemoryStorage())).toEqual({ todos: [], recovered: false });
  });

  it('returns stored todos', () => {
    const todos = makeFixtureTodos();
    const storage = new MemoryStorage({ [STORAGE_KEY]: JSON.stringify(toStoredData(todos)) });

    expect(loadTodos(storage)).toEqual({ todos, recovered: false });
    expect(storage.getItem(CORRUPT_BACKUP_KEY)).toBeNull();
  });

  it('backs up broken JSON and starts empty with recovered=true', () => {
    const raw = '{"schemaVersion":1,"todos":[';
    const storage = new MemoryStorage({ [STORAGE_KEY]: raw });

    expect(loadTodos(storage)).toEqual({ todos: [], recovered: true });
    expect(storage.getItem(CORRUPT_BACKUP_KEY)).toBe(raw);
  });

  it('backs up data with a missing field', () => {
    const withoutPriority: Record<string, unknown> = { ...makeTodo() };
    delete withoutPriority.priority;
    const raw = JSON.stringify({ schemaVersion: 1, todos: [withoutPriority] });
    const storage = new MemoryStorage({ [STORAGE_KEY]: raw });

    expect(loadTodos(storage)).toEqual({ todos: [], recovered: true });
    expect(storage.getItem(CORRUPT_BACKUP_KEY)).toBe(raw);
  });

  it('still reports recovery when the backup itself cannot be written', () => {
    const storage = new QuotaExceededStorage({ [STORAGE_KEY]: 'not json' });

    expect(loadTodos(storage)).toEqual({ todos: [], recovered: true });
  });

  it('treats unreadable storage as empty', () => {
    expect(loadTodos(new BlockedStorage())).toEqual({ todos: [], recovered: false });
  });
});

describe('saveTodos (§8.2 #10)', () => {
  it('writes the versioned shape that loadTodos reads back', () => {
    const storage = new MemoryStorage();
    const todos = makeFixtureTodos();

    expect(saveTodos(storage, todos)).toEqual({ ok: true, value: undefined });
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? '')).toEqual({ schemaVersion: 1, todos });
    expect(loadTodos(storage).todos).toEqual(todos);
  });

  it('returns STORAGE_QUOTA when the storage is full', () => {
    const result = saveTodos(new QuotaExceededStorage(), [makeTodo()]);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('STORAGE_QUOTA');
  });

  it('returns STORAGE_UNAVAILABLE for other access errors', () => {
    const result = saveTodos(new BlockedStorage(), [makeTodo()]);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('STORAGE_UNAVAILABLE');
  });
});

describe('isQuotaExceededError', () => {
  it.each([
    [new DOMException('full', 'QuotaExceededError'), true],
    [{ name: 'NS_ERROR_DOM_QUOTA_REACHED' }, true],
    [{ name: 'Error', code: 22 }, true],
    [{ code: 1014 }, true],
    [new DOMException('denied', 'SecurityError'), false],
    [new Error('boom'), false],
    ['QuotaExceededError', false],
    [null, false],
  ])('%o -> %s', (error, expected) => {
    expect(isQuotaExceededError(error)).toBe(expected);
  });
});

describe('getBrowserStorage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns localStorage when it can be read', () => {
    expect(getBrowserStorage()).toBe(globalThis.localStorage);
  });

  it('returns null when accessing localStorage throws', () => {
    vi.spyOn(globalThis, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });

    expect(getBrowserStorage()).toBeNull();
  });
});
