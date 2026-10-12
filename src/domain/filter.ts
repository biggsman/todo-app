// Design Ref: §3.2, §4.1 — filtering and the category/tag lists derived from current todos.
import type { StatusFilter, Todo, TodoQuery } from './todo';

const STATUS_MATCHERS: Record<StatusFilter, (todo: Todo) => boolean> = {
  all: () => true,
  active: (todo) => !todo.completed,
  completed: (todo) => todo.completed,
};

/** Keeps todos matching every condition in the query (AND). Null category/tag means "all". */
export function filterTodos(todos: Todo[], query: TodoQuery): Todo[] {
  const matchesStatus = STATUS_MATCHERS[query.status];
  const needle = query.text.trim().toLowerCase();

  // Plan SC: FR-09, FR-10 — status, text, category and tag combine with AND
  return todos.filter(
    (todo) =>
      matchesStatus(todo) &&
      matchesText(todo, needle) &&
      (query.category === null || todo.category === query.category) &&
      (query.tag === null || todo.tags.includes(query.tag)),
  );
}

/** Distinct categories in use, sorted for display. */
export function collectCategories(todos: Todo[]): string[] {
  const categories = todos.flatMap((todo) => (todo.category === null ? [] : [todo.category]));
  return sortedUnique(categories);
}

/** Distinct tags in use, sorted for display. */
export function collectTags(todos: Todo[]): string[] {
  return sortedUnique(todos.flatMap((todo) => todo.tags));
}

// Plan SC: FR-09 — case-insensitive partial match against the title or any tag
function matchesText(todo: Todo, needle: string): boolean {
  if (needle === '') return true;
  return todo.title.toLowerCase().includes(needle) || todo.tags.some((tag) => tag.includes(needle));
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}
