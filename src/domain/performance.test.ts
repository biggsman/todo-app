// Design Ref: §8.5, Plan NFR Performance — filter + sort over 1,000 todos stays under 100ms.
import { describe, expect, it } from 'vitest';
import { makeTodos } from '@/test/factories';
import { filterTodos } from './filter';
import { sortTodos } from './sort';
import type { SortKey, TodoQuery } from './todo';

const TODO_COUNT = 1000;
const BUDGET_MS = 100;
const SORT_KEYS: SortKey[] = ['dueDate', 'priority', 'createdAt'];
const EMPTY_QUERY: TodoQuery = { status: 'all', text: '', category: null, tag: null };
const BUSY_QUERY: TodoQuery = {
  status: 'active',
  text: 'todo 1',
  category: 'category-1',
  tag: null,
};

describe('filter + sort performance (NFR)', () => {
  it.each(SORT_KEYS)('filters and sorts 1,000 todos by %s in under 100ms', (sortKey) => {
    const todos = makeTodos(TODO_COUNT);
    // Warm-up so JIT compilation is not counted against the pipeline.
    sortTodos(filterTodos(todos, EMPTY_QUERY), sortKey);

    for (const query of [EMPTY_QUERY, BUSY_QUERY]) {
      const start = performance.now();
      const visible = sortTodos(filterTodos(todos, query), sortKey);
      const elapsed = performance.now() - start;

      expect(visible.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(BUDGET_MS);
    }
  });
});
