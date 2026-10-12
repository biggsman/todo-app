// Design Ref: §4.1 — sorting returns a new array; ties fall back to newest-first.
import type { Priority, SortKey, Todo } from './todo';

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

type Comparator = (a: Todo, b: Todo) => number;

const newestFirst: Comparator = (a, b) => compareStrings(b.createdAt, a.createdAt);

// Plan SC: FR-08 — todos without a due date always go after dated ones
const byDueDate: Comparator = (a, b) => {
  if (a.dueDate === b.dueDate) return 0;
  if (a.dueDate === null) return 1;
  if (b.dueDate === null) return -1;
  return compareStrings(a.dueDate, b.dueDate);
};

const byPriority: Comparator = (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];

const PRIMARY_COMPARATORS: Record<SortKey, Comparator> = {
  dueDate: byDueDate,
  priority: byPriority,
  createdAt: newestFirst,
};

/**
 * Returns a sorted copy; the input array is never mutated. Array.prototype.sort is stable,
 * so todos that tie on every key keep their original relative order.
 */
export function sortTodos(todos: Todo[], key: SortKey): Todo[] {
  const primary = PRIMARY_COMPARATORS[key];
  return [...todos].sort((a, b) => primary(a, b) || newestFirst(a, b));
}

function compareStrings(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
