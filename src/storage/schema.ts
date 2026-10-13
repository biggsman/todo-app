// Design Ref: §3.3, §7 — localStorage keys and field-level validation of persisted/imported todos.
// Anything read back from storage or a file is untrusted: every field is checked and unknown
// fields are dropped, so the rest of the app can trust the Todo type.
import { isIsoTimestamp, isValidDateString } from '@/domain/date';
import { fail, ok } from '@/domain/errors';
import { normalizeTags, validateCategory, validateTitle } from '@/domain/validate';
import type { Priority, Result, Todo } from '@/domain/todo';

export const CURRENT_SCHEMA_VERSION = 1;

export const STORAGE_KEY = 'todo-app:v1';
// `todo-app:theme` (§3.3) is a UI preference owned by theme/useTheme.ts, which may not import storage/.
export const CORRUPT_BACKUP_KEY = 'todo-app:corrupt-backup';
export const PRE_IMPORT_BACKUP_KEY = 'todo-app:pre-import-backup';

/** Shape stored under STORAGE_KEY and PRE_IMPORT_BACKUP_KEY. */
export interface StoredData {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  todos: Todo[];
}

/** Where validation failed, e.g. `todos[2].priority`. */
export interface SchemaIssue {
  path: string;
}

const PRIORITIES: readonly Priority[] = ['high', 'medium', 'low'];

export function toStoredData(todos: Todo[]): StoredData {
  return { schemaVersion: CURRENT_SCHEMA_VERSION, todos };
}

export function parseStoredData(raw: unknown): Result<Todo[]> {
  // Plan SC: FR-14 — anything but `{ schemaVersion: 1, todos: Todo[] }` counts as corrupt
  if (!isRecord(raw) || raw.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    return fail('STORAGE_CORRUPT');
  }
  const todos = parseTodoList(raw.todos);
  return todos.ok ? todos : fail('STORAGE_CORRUPT');
}

/** Validates a `todos` array; the error points at the first invalid field. Ids must be unique. */
export function parseTodoList(raw: unknown): Result<Todo[], SchemaIssue> {
  if (!Array.isArray(raw)) return issue('todos');

  const todos: Todo[] = [];
  const seenIds = new Set<string>();
  for (const [index, item] of raw.entries()) {
    const todo = parseTodo(item);
    if (!todo.ok) return issue(`todos[${index}]${todo.error.path}`);
    if (seenIds.has(todo.value.id)) return issue(`todos[${index}].id`);
    seenIds.add(todo.value.id);
    todos.push(todo.value);
  }
  return ok(todos);
}

function parseTodo(raw: unknown): Result<Todo, SchemaIssue> {
  if (!isRecord(raw)) return issue('');

  const { id, completed, priority, dueDate, createdAt, updatedAt, completedAt } = raw;
  if (typeof id !== 'string' || id.length === 0) return issue('.id');

  const title = typeof raw.title === 'string' ? validateTitle(raw.title) : null;
  if (!title?.ok) return issue('.title');

  if (typeof completed !== 'boolean') return issue('.completed');
  if (!isPriority(priority)) return issue('.priority');
  if (!isDueDate(dueDate)) return issue('.dueDate');

  const category = parseCategory(raw.category);
  if (!category.ok) return issue('.category');

  const tags = isStringArray(raw.tags) ? normalizeTags(raw.tags) : null;
  if (!tags?.ok) return issue('.tags');

  if (!isTimestamp(createdAt)) return issue('.createdAt');
  if (!isTimestamp(updatedAt)) return issue('.updatedAt');
  if (!(completedAt === null || isTimestamp(completedAt))) return issue('.completedAt');

  // Building a fresh object drops unknown fields (§7).
  return ok({
    id,
    title: title.value,
    completed,
    priority,
    dueDate,
    category: category.value,
    tags: tags.value,
    createdAt,
    updatedAt,
    completedAt,
  });
}

function parseCategory(raw: unknown): Result<string | null> {
  if (raw === null) return ok(null);
  if (typeof raw !== 'string') return fail('INVALID_CATEGORY');
  return validateCategory(raw);
}

function issue(path: string): Result<never, SchemaIssue> {
  return { ok: false, error: { path } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isPriority(value: unknown): value is Priority {
  return PRIORITIES.includes(value as Priority);
}

function isDueDate(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && isValidDateString(value));
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && isIsoTimestamp(value);
}
