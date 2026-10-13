// Design Ref: §4.1 (v0.2) — sorting returns a new array; ties fall back to newest-first.
// 마감일순·우선순위순 put open todos before completed ones; 최신순 is purely by createdAt.
import type { Priority, SortKey, Todo } from './todo';

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

type Comparator = (a: Todo, b: Todo) => number;

const newestFirst: Comparator = (a, b) => compareStrings(b.createdAt, a.createdAt);

// Plan SC: FR-08 — finished work never hides the next due or most important open todo
const activeFirst: Comparator = (a, b) => Number(a.completed) - Number(b.completed);

// Plan SC: FR-08 — todos without a due date always go after dated ones
const byDueDate: Comparator = (a, b) => {
  if (a.dueDate === b.dueDate) return 0;
  if (a.dueDate === null) return 1;
  if (b.dueDate === null) return -1;
  return compareStrings(a.dueDate, b.dueDate);
};

const byPriority: Comparator = (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];

const COMPARATORS: Record<SortKey, Comparator[]> = {
  dueDate: [activeFirst, byDueDate],
  priority: [activeFirst, byPriority],
  createdAt: [],
};

/**
 * Returns a sorted copy; the input array is never mutated. Array.prototype.sort is stable,
 * so todos that tie on every key keep their original relative order.
 */
export function sortTodos(todos: Todo[], key: SortKey): Todo[] {
  const comparators = [...COMPARATORS[key], newestFirst];
  return [...todos].sort((a, b) => {
    for (const compare of comparators) {
      const order = compare(a, b);
      if (order !== 0) return order;
    }
    return 0;
  });
}

function compareStrings(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
