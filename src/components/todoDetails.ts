// Design Ref: §5.3, §6.1 — form values shared by TodoInput and TodoEditor, Korean labels, and
// the mapping from a domain error code to the field that shows it inline.
import { DEFAULT_PRIORITY } from '@/domain/todo';
import type { AppError, Priority, SortKey, StatusFilter, Todo } from '@/domain/todo';

/** Raw form values. Empty strings mean "none"; the domain normalizes them to null. */
export interface TodoDetailsValue {
  dueDate: string;
  priority: Priority;
  category: string;
  tags: string[];
}

export type FormField = 'title' | 'category' | 'tags';
export type FieldErrors = Partial<Record<FormField, string>>;

export const EMPTY_DETAILS: TodoDetailsValue = {
  dueDate: '',
  priority: DEFAULT_PRIORITY,
  category: '',
  tags: [],
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
};

/** Display order of the priority options (§5.4: 높음/보통/낮음). */
export const PRIORITY_OPTIONS: Priority[] = ['high', 'medium', 'low'];

export const STATUS_LABELS: Record<StatusFilter, string> = {
  all: '전체',
  active: '진행 중',
  completed: '완료',
};

export const STATUS_OPTIONS: StatusFilter[] = ['all', 'active', 'completed'];

export const SORT_LABELS: Record<SortKey, string> = {
  dueDate: '마감일순',
  priority: '우선순위순',
  createdAt: '최신순',
};

export const SORT_OPTIONS: SortKey[] = ['dueDate', 'priority', 'createdAt'];

export function detailsFromTodo(todo: Todo): TodoDetailsValue {
  return {
    dueDate: todo.dueDate ?? '',
    priority: todo.priority,
    category: todo.category ?? '',
    tags: todo.tags,
  };
}

const FIELD_BY_ERROR_CODE: Partial<Record<AppError['code'], FormField>> = {
  EMPTY_TITLE: 'title',
  TITLE_TOO_LONG: 'title',
  INVALID_CATEGORY: 'category',
  INVALID_TAG: 'tags',
};

/** Puts a validation error next to the field it belongs to (title when unknown). */
export function toFieldErrors(error: AppError): FieldErrors {
  return { [FIELD_BY_ERROR_CODE[error.code] ?? 'title']: error.message };
}
