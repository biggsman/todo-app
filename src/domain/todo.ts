// Design Ref: §3.1, §4.1 — Todo entity, shared types, and pure create/update/toggle transitions.
// `now` and `id` are injected so the domain never touches the clock or crypto directly.
import { isValidDateString } from './date';
import { ok } from './errors';
import { normalizeTags, validateCategory, validateTitle } from './validate';

export type Priority = 'high' | 'medium' | 'low';

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  dueDate: string | null;
  category: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export type StatusFilter = 'all' | 'active' | 'completed';
export type SortKey = 'dueDate' | 'priority' | 'createdAt';
export type DueStatus = 'overdue' | 'today' | 'upcoming' | 'none';

export interface TodoQuery {
  status: StatusFilter;
  text: string;
  category: string | null;
  tag: string | null;
}

// Design Ref: §6.1 — every user-facing failure has a code
export type ErrorCode =
  | 'EMPTY_TITLE'
  | 'TITLE_TOO_LONG'
  | 'INVALID_TAG'
  | 'INVALID_CATEGORY'
  | 'STORAGE_QUOTA'
  | 'STORAGE_UNAVAILABLE'
  | 'STORAGE_CORRUPT'
  | 'IMPORT_INVALID_JSON'
  | 'IMPORT_SCHEMA_MISMATCH'
  | 'IMPORT_TOO_LARGE';

export interface AppError {
  code: ErrorCode;
  message: string;
}

export type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E };

export const DEFAULT_PRIORITY: Priority = 'medium';

/** Raw values from the add form. Optional fields fall back to the defaults in §3.1. */
export interface NewTodoInput {
  title: string;
  priority?: Priority;
  dueDate?: string | null;
  category?: string | null;
  tags?: string[];
}

/** Editable fields (FR-03). Completion is changed only through toggleTodo. */
export type TodoPatch = Partial<NewTodoInput>;

type TodoDetails = Pick<Todo, 'title' | 'priority' | 'dueDate' | 'category' | 'tags'>;

export function createTodo(input: NewTodoInput, now: Date, id: string): Result<Todo> {
  const details = validateDetails(input);
  if (!details.ok) return details;

  const timestamp = now.toISOString();
  // Plan SC: FR-01/FR-07 — new todos start active with priority 'medium' unless chosen
  return ok({
    id,
    ...details.value,
    completed: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
  });
}

export function updateTodo(todo: Todo, patch: TodoPatch, now: Date): Result<Todo> {
  const details = validateDetails({ ...todo, ...patch });
  if (!details.ok) return details;

  return ok({ ...todo, ...details.value, updatedAt: now.toISOString() });
}

export function toggleTodo(todo: Todo, now: Date): Todo {
  const timestamp = now.toISOString();
  const completed = !todo.completed;
  // Plan SC: FR-02 — completedAt is set on completion and cleared when reopened
  return {
    ...todo,
    completed,
    completedAt: completed ? timestamp : null,
    updatedAt: timestamp,
  };
}

function validateDetails(input: NewTodoInput): Result<TodoDetails> {
  const title = validateTitle(input.title);
  if (!title.ok) return title;

  const tags = normalizeTags(input.tags ?? []);
  if (!tags.ok) return tags;

  const category = validateCategory(input.category ?? '');
  if (!category.ok) return category;

  return ok({
    title: title.value,
    priority: input.priority ?? DEFAULT_PRIORITY,
    dueDate: normalizeDueDate(input.dueDate),
    category: category.value,
    tags: tags.value,
  });
}

function normalizeDueDate(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim() ?? '';
  if (trimmed === '') return null;
  // The date input only produces 'YYYY-MM-DD', so anything else is a programming error.
  if (!isValidDateString(trimmed)) {
    throw new RangeError(`dueDate must be 'YYYY-MM-DD', got '${trimmed}'`);
  }
  return trimmed;
}
