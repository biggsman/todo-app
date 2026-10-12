// Design Ref: §2.2, §3.3, §6.1 — load/save todos in localStorage with corruption recovery.
// Storage is passed in (never read from a global here) so tests can use an in-memory fake.
import { fail, ok } from '@/domain/errors';
import { CORRUPT_BACKUP_KEY, STORAGE_KEY, parseStoredData, toStoredData } from './schema';
import type { Result, Todo } from '@/domain/todo';

export interface LoadResult {
  todos: Todo[];
  /** True when stored data was unreadable and the app started empty (FR-14). */
  recovered: boolean;
}

// Legacy numeric codes: 22 in most browsers, 1014 in old Firefox (NS_ERROR_DOM_QUOTA_REACHED).
const QUOTA_ERROR_NAMES = ['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED'];
const QUOTA_ERROR_CODES = [22, 1014];

export function loadTodos(storage: Storage): LoadResult {
  const raw = readItem(storage, STORAGE_KEY);
  if (raw === null) return { todos: [], recovered: false };

  const parsed = parseStoredData(parseJson(raw));
  if (parsed.ok) return { todos: parsed.value, recovered: false };

  // Plan SC: FR-14 — keep the unreadable original aside before starting empty
  writeItemQuietly(storage, CORRUPT_BACKUP_KEY, raw);
  return { todos: [], recovered: true };
}

export function saveTodos(storage: Storage, todos: Todo[]): Result<void> {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(toStoredData(todos)));
    return ok(undefined);
  } catch (error) {
    // Plan SC: FR-05 — a full storage is reported, the in-memory state stays as it is
    return fail(isQuotaExceededError(error) ? 'STORAGE_QUOTA' : 'STORAGE_UNAVAILABLE');
  }
}

/**
 * The browser's localStorage, or null when it cannot be used (disabled cookies, sandboxed
 * iframes, some private modes throw on access). Only reads are probed: a full storage is
 * still usable for loading and is reported as STORAGE_QUOTA on save.
 */
export function getBrowserStorage(): Storage | null {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return null;
    storage.getItem(STORAGE_KEY);
    return storage;
  } catch {
    return null;
  }
}

export function isQuotaExceededError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { name, code } = error as { name?: unknown; code?: unknown };
  return (
    (typeof name === 'string' && QUOTA_ERROR_NAMES.includes(name)) ||
    (typeof code === 'number' && QUOTA_ERROR_CODES.includes(code))
  );
}

function readItem(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    // Unreadable storage behaves like empty storage; saving will then report the problem.
    return null;
  }
}

/** Best-effort write: a failed backup must not stop the app from starting. */
function writeItemQuietly(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    // Ignored on purpose; see the doc comment.
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}
